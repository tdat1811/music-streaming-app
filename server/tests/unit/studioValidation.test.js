// Kiểm thử đơn vị: quy tắc trong Artist Studio (sheet UT26, UT27, UT28)
const {
  validateSongFields,
  validateAlbumFields,
  validateArtistPage,
  checkStatusChange,
  canDeleteSong,
} = require('../../src/utils/studioValidation');
const { formatDuration, mp3Seconds, m4aSeconds } = require('../../src/services/audioDuration');

describe('UT26 – validateSongFields(body, artistGenres, { partial })', () => {
  const GENRES = ['Pop', 'Ballad'];
  const keys = (body, opts) => Object.keys(validateSongFields(body, GENRES, opts).errors);

  it.each([
    ['UTCID01', { title: 'Mùa thu Hà Nội', genre: 'Pop' }, []],
    ['UTCID02', { title: '   ', genre: 'Pop' }, ['title']],
    ['UTCID03', { title: 'x'.repeat(151), genre: 'Pop' }, ['title']],
    ['UTCID04', { title: 'x'.repeat(150), genre: 'Pop' }, []],                // biên 150 ký tự
    ['UTCID05', { title: 'A', genre: '' }, ['genre']],
    ['UTCID06', { title: 'A', genre: 'Rap' }, ['genre']],                     // không thuộc thể loại của nghệ sĩ
    ['UTCID07', { title: 'A', genre: 'Pop', description: 'x'.repeat(1001) }, ['description']],
    ['UTCID08', { title: 'A', genre: 'Pop', coverImage: '/covers/img_1.png' }, []],
    ['UTCID09', { title: 'A', genre: 'Pop', coverImage: 'http://evil.com/x.png' }, ['coverImage']],
  ])('%s: %j → lỗi %j', (_ma, body, mongDoi) => {
    expect(keys(body)).toEqual(mongDoi);
  });

  it('UTCID10: sửa một phần (partial) – chỉ kiểm tra trường được gửi', () => {
    expect(keys({ description: 'Mới' }, { partial: true })).toEqual([]);
    expect(keys({ title: '' }, { partial: true })).toEqual(['title']);
  });

  it('UTCID11: nghệ sĩ chưa khai báo thể loại → nhận mọi thể loại trong danh sách chung', () => {
    expect(Object.keys(validateSongFields({ title: 'A', genre: 'Rap' }, []).errors)).toEqual([]);
  });
});

describe('UT27 – validateAlbumFields / validateArtistPage', () => {
  const NOW = new Date('2026-11-16T00:00:00Z');
  const album = (b) => Object.keys(validateAlbumFields({ title: 'Hà Nội Stories', releaseYear: '2024', songIds: ['s1'], ...b }, NOW).errors);

  it.each([
    ['UTCID01', {}, []],
    ['UTCID02', { title: '' }, ['title']],
    ['UTCID03', { releaseYear: '1899' }, ['releaseYear']],
    ['UTCID04', { releaseYear: '2027' }, []],                    // năm sau vẫn được (đặt trước)
    ['UTCID05', { releaseYear: '2028' }, ['releaseYear']],
    ['UTCID06', { releaseYear: '24' }, ['releaseYear']],
    ['UTCID07', { songIds: ['s1', 's1'] }, ['songIds']],          // trùng bài
    ['UTCID08', { songIds: Array.from({ length: 31 }, (_, i) => `s${i}`) }, ['songIds']],
    ['UTCID09', { songIds: [] }, []],                            // album nháp chưa có bài
  ])('%s: album %j → lỗi %j', (_ma, b, mongDoi) => {
    expect(album(b)).toEqual(mongDoi);
  });

  const page = { stageName: 'Ashley S.', genres: ['Pop'], bio: 'Singer from Hà Nội writing honest songs.', socialLinks: [] };
  it.each([
    ['UTCID10', {}, []],
    ['UTCID11', { stageName: '' }, ['stageName']],
    ['UTCID12', { genres: [] }, ['genres']],
    ['UTCID13', { avatarImage: '/covers/img_a.jpg', aboutImage: '/avatars/av_b.png' }, []],
    ['UTCID14', { aboutImage: '../secret.png' }, ['aboutImage']],
  ])('%s: trang nghệ sĩ %j → lỗi %j', (_ma, b, mongDoi) => {
    expect(Object.keys(validateArtistPage({ ...page, ...b }).errors)).toEqual(mongDoi);
  });
});

describe('UT28 – checkStatusChange / canDeleteSong / formatDuration', () => {
  it.each([
    ['UTCID01', { plays: 0 }, 'published', null],
    ['UTCID02', { plays: 0 }, 'draft', null],
    ['UTCID03', { plays: 5 }, 'hidden', null],
    ['UTCID04', { plays: 5 }, 'published', null],
    ['UTCID05', { plays: 5 }, 'draft', 'has plays'],           // đã có lượt nghe: không về nháp được
    ['UTCID06', { plays: 0 }, 'deleted', 'invalid'],
  ])('%s: checkStatusChange(%j, %p)', (_ma, song, status, loai) => {
    const kq = checkStatusChange(song, status);
    if (loai === null) expect(kq).toBeNull();
    else expect(kq).toMatch(loai === 'has plays' ? /already has plays/ : /must be/);
  });

  it.each([
    ['UTCID07', { plays: 0 }, true],
    ['UTCID08', {}, true],
    ['UTCID09', { plays: 1 }, false],                         // đã có lượt nghe: chỉ ẩn được
  ])('%s: canDeleteSong(%j) = %p', (_ma, song, mongDoi) => {
    expect(canDeleteSong(song)).toBe(mongDoi);
  });

  it.each([
    ['UTCID10', 222.4, '03:42'],
    ['UTCID11', 59.6, '01:00'],
    ['UTCID12', 3730, '1:02:10'],
    ['UTCID13', 0, null],
    ['UTCID14', NaN, null],
  ])('%s: formatDuration(%p) = %p', (_ma, giay, mongDoi) => {
    expect(formatDuration(giay)).toBe(mongDoi);
  });

  // Khung MP3 giả: FF FB 90 = MPEG-1 Layer III, 128 kbps, 44.1 kHz, stereo
  const khungMp3 = (kichThuoc, xingFrames) => {
    const buf = Buffer.alloc(kichThuoc);
    buf.set([0xff, 0xfb, 0x90, 0x00], 0);
    if (xingFrames) {
      buf.write('Xing', 4 + 32, 'latin1');
      buf.writeUInt32BE(1, 4 + 32 + 4); // cờ: có số khung
      buf.writeUInt32BE(xingFrames, 4 + 32 + 8);
    }
    return buf;
  };

  it('UTCID15: mp3Seconds – file CBR 128 kbps, 160.000 byte → 10 giây', () => {
    expect(mp3Seconds(khungMp3(160000))).toBeCloseTo(10, 5);
  });

  it('UTCID16: mp3Seconds – có header Xing (VBR) 3828 khung → ~100 giây', () => {
    expect(formatDuration(mp3Seconds(khungMp3(5000, 3828)))).toBe('01:40');
  });

  it('UTCID17: mp3Seconds / m4aSeconds – dữ liệu không phải file nhạc → null', () => {
    expect(mp3Seconds(Buffer.from('ID3 fake mp3'))).toBeNull();
    expect(m4aSeconds(Buffer.from('not an mp4 file'))).toBeNull();
  });
});
