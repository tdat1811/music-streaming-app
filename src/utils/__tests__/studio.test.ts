// Kiểm thử đơn vị: Artist Studio phía app (sheet UT29, UT30) và kho bài hát / album từ máy chủ (sheet UT31)
import {
  canDeleteSong,
  formatFileSize,
  moveItem,
  songActions,
  songGenreOptions,
  statusForAction,
  StudioSong,
  validateAlbumForm,
  validateAudioFile,
  validateSongForm,
} from '../studio';
import { mapServerAlbum, mergeAlbums } from '../albums';
import { getSongsByIds } from '../../data/musicData';
import { markSongsUnavailable, registerSongs, resetSongRegistry } from '../../data/songRegistry';

describe('UT29 – validateAudioFile / validateSongForm / songGenreOptions', () => {
  it.each([
    ['UTCID01', { name: 'song.mp3', size: 5_000_000 }, null],
    ['UTCID02', { name: 'SONG.M4A', size: 1000 }, null],                    // không phân biệt hoa thường
    ['UTCID03', { name: 'concert.wav', size: 1000 }, 'not supported'],
    ['UTCID04', { name: 'big.mp3', size: 20 * 1024 * 1024 + 1 }, 'larger than 20 MB'],
    ['UTCID05', { name: 'exact.mp3', size: 20 * 1024 * 1024 }, null],        // đúng 20 MB
    ['UTCID06', null, 'choose an audio file'],
  ])('%s: validateAudioFile(%j)', (_ma, file, loi) => {
    const kq = validateAudioFile(file as any);
    if (loi === null) expect(kq).toBeNull();
    else expect(kq).toContain(loi);
  });

  const G = ['Pop', 'Ballad'];
  it.each([
    ['UTCID07', { title: 'Mùa thu', genre: 'Pop' }, []],
    ['UTCID08', { title: '  ', genre: 'Pop' }, ['title']],
    ['UTCID09', { title: 'A', genre: '' }, ['genre']],
    ['UTCID10', { title: 'A', genre: 'Rap' }, ['genre']],
    ['UTCID11', { title: 'x'.repeat(151), genre: 'Pop', description: 'y'.repeat(1001) }, ['title', 'description']],
  ])('%s: validateSongForm(%j) → lỗi %j', (_ma, form, mongDoi) => {
    expect(Object.keys(validateSongForm(form, G))).toEqual(mongDoi);
  });

  it('UTCID12: songGenreOptions – nghệ sĩ chưa có thể loại thì dùng danh sách chung', () => {
    expect(songGenreOptions(['Pop'])).toEqual(['Pop']);
    expect(songGenreOptions([])).toContain('Rap');
    expect(songGenreOptions(null)).toContain('Jazz');
  });
});

describe('UT30 – songActions / canDeleteSong / validateAlbumForm / moveItem', () => {
  it.each([
    ['UTCID01', 'published', ['play', 'edit', 'hide', 'delete']],
    ['UTCID02', 'draft', ['play', 'edit', 'publish', 'delete']],
    ['UTCID03', 'hidden', ['play', 'edit', 'show', 'delete']],
  ])('%s: songActions(%p)', (_ma, status, mongDoi) => {
    expect(songActions({ status: status as any })).toEqual(mongDoi);
  });

  it('UTCID04: statusForAction – publish/show → published, hide → hidden, khác → null', () => {
    expect([statusForAction('publish'), statusForAction('show'), statusForAction('hide'), statusForAction('edit')]).toEqual(['published', 'published', 'hidden', null]);
  });

  it('UTCID05: canDeleteSong – chỉ bài 0 lượt nghe', () => {
    expect([canDeleteSong({ plays: 0 }), canDeleteSong({ plays: 3 })]).toEqual([true, false]);
  });

  const songs: Record<string, StudioSong> = {
    p: { id: 'p', title: 'P', artist: 'A', status: 'published', plays: 1 },
    d: { id: 'd', title: 'D', artist: 'A', status: 'draft', plays: 0 },
  };
  const NOW = new Date(2026, 10, 16);
  it.each([
    ['UTCID06', { title: 'EP', releaseYear: '2026', songIds: ['p', 'd'] }, true, []],
    ['UTCID07', { title: 'EP', releaseYear: '2026', songIds: ['d'] }, true, ['songIds']],   // đăng mà không có bài đã đăng
    ['UTCID08', { title: 'EP', releaseYear: '2026', songIds: ['d'] }, false, []],           // lưu nháp thì được
    ['UTCID09', { title: '', releaseYear: '20', songIds: [] }, false, ['title', 'releaseYear']],
    ['UTCID10', { title: 'EP', releaseYear: '2028', songIds: [] }, false, ['releaseYear']],
  ])('%s: validateAlbumForm(%j, publish=%p) → lỗi %j', (_ma, form, publish, mongDoi) => {
    expect(Object.keys(validateAlbumForm(form, publish, songs, NOW))).toEqual(mongDoi);
  });

  it('UTCID11: moveItem – đổi chỗ lên / xuống, ra ngoài biên thì giữ nguyên', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
  });

  it('UTCID12: formatFileSize', () => {
    expect([formatFileSize(500), formatFileSize(6.8 * 1024 * 1024), formatFileSize(null)]).toEqual(['1 KB', '6.8 MB', '']);
  });
});

describe('UT31 – kho bài hát (songRegistry + getSongsByIds) / mergeAlbums', () => {
  beforeEach(() => resetSongRegistry());

  it('UTCID01: bài chỉ có trên máy chủ → getSongsByIds tìm thấy sau khi đăng ký vào kho', () => {
    expect(getSongsByIds(['s_new1'])).toEqual([]);
    registerSongs([{ id: 's_new1', title: 'Mùa thu Hà Nội', artist: 'Ashley S.', coverImage: '/covers/a.jpg' }]);
    expect(getSongsByIds(['s_new1']).map((s) => s.title)).toEqual(['Mùa thu Hà Nội']);
  });

  it('UTCID02: bài máy chủ báo đã ẩn / xoá → bị bỏ ra, kể cả khi có trong dữ liệu sẵn của app', () => {
    const coSan = getSongsByIds(['s1']);
    markSongsUnavailable(['s1']);
    expect(coSan.length).toBe(1);
    expect(getSongsByIds(['s1'])).toEqual([]);
  });

  it('UTCID03: giữ đúng thứ tự id được hỏi', () => {
    registerSongs([
      { id: 'x2', title: 'B', artist: 'A', coverImage: '' },
      { id: 'x1', title: 'A', artist: 'A', coverImage: '' },
    ]);
    expect(getSongsByIds(['x1', 'x2']).map((s) => s.id)).toEqual(['x1', 'x2']);
  });

  it('UTCID04: mergeAlbums – album mới từ máy chủ được thêm; album máy chủ rỗng không bị đoán bài', () => {
    const moi = mapServerAlbum({ id: 'alb_x', title: 'Hà Nội Stories', artist: 'Ashley S.', artistId: 'art_x', songIds: [] });
    const kq = mergeAlbums([{ id: 'a1', title: 'Old', artist: 'X', coverImage: 'c.png' }], [moi]);
    expect(kq.map((a) => a.id)).toEqual(['a1', 'alb_x']);
    expect(kq[1].artistId).toBe('art_x');
  });
});
