// Kiểm thử đơn vị: tìm kiếm tương đối (sheet UT01, UT02, UT03 trong file Excel)
import { fuzzyScore, fuzzySearch, normalizeText } from '../fuzzySearch';

describe('UT01 – normalizeText(text)', () => {
  it.each([
    ['UTCID01', 'Sơn Tùng M-TP', 'son tung m tp'],
    ['UTCID02', 'Đen Vâu', 'den vau'],
    ['UTCID03', '  Blinding   LIGHTS!! ', 'blinding lights'],
    ['UTCID04', "Don't Start Now", 'dont start now'],
    ['UTCID05', '', ''],
    ['UTCID06', '!!!', ''],
    ['UTCID07', null, ''],
    ['UTCID08', 12345, '12345'],
  ])('%s: normalizeText(%p) = %p', (_ma, dauVao, mongDoi) => {
    expect(normalizeText(dauVao)).toBe(mongDoi);
  });
});

describe('UT02 – fuzzyScore(query, fields)', () => {
  const BLINDING = ['Blinding Lights', 'The Weeknd'];
  const STARBOY = ['Starboy', 'The Weeknd ft. Daft Punk'];

  it.each([
    ['UTCID01', 'blinding', BLINDING, 3],          // cụm từ khoá ở đầu nội dung
    ['UTCID02', 'lights', BLINDING, 2],            // cụm từ khoá nằm trong nội dung
    ['UTCID03', 'lights blinding', BLINDING, 1],   // đảo thứ tự từ, mỗi từ khớp chính xác
    ['UTCID04', 'weekend', STARBOY, 0.5],          // gõ sai 1 ký tự
    ['UTCID05', 'weeknd starboy', STARBOY, 1],
    ['UTCID06', '', BLINDING, 1],                  // từ khoá rỗng: không lọc
    ['UTCID07', 'xyz', BLINDING, 0],               // không khớp
    ['UTCID08', 'blindng lihgts', BLINDING, 0],    // đảo 2 chữ cái = 2 lỗi, vượt ngưỡng
    ['UTCID09', 'xyz', [], 0],                     // nội dung rỗng
    ['UTCID10', 'a', STARBOY, 2],                  // 1 ký tự
  ])('%s: fuzzyScore(%p, %j) = %p', (_ma, query, fields, mongDoi) => {
    expect(fuzzyScore(query, fields)).toBe(mongDoi);
  });
});

describe('UT03 – fuzzySearch(items, query, getFields)', () => {
  const SONGS = [
    { title: 'Blinding Lights', artist: 'The Weeknd' },
    { title: 'Starboy', artist: 'The Weeknd ft. Daft Punk' },
    { title: 'Lạc Trôi', artist: 'Sơn Tùng M-TP' },
    { title: 'In The Stars', artist: 'Benson Boone' },
  ];
  const getFields = (s: { title: string; artist: string }) => [s.title, s.artist];
  const titles = (list: typeof SONGS) => list.map((s) => s.title);
  const ALL = ['Blinding Lights', 'Starboy', 'Lạc Trôi', 'In The Stars'];

  it.each([
    ['UTCID01', 'weeknd', ['Blinding Lights', 'Starboy']],
    ['UTCID02', 'son tung', ['Lạc Trôi']],
    ['UTCID03', 'star', ['Starboy', 'In The Stars']],   // Starboy xếp trước (khớp đầu cụm)
    ['UTCID04', '', ALL],                                // rỗng: giữ nguyên danh sách
    ['UTCID05', '   ', ALL],
    ['UTCID06', 'zzzz', []],
  ])('%s: fuzzySearch(4 bài, %p) = %j', (_ma, query, mongDoi) => {
    const truocKhiGoi = JSON.stringify(SONGS);
    expect(titles(fuzzySearch(SONGS, query, getFields))).toEqual(mongDoi);
    expect(JSON.stringify(SONGS)).toBe(truocKhiGoi); // không sửa mảng đầu vào
  });

  it('UTCID07: fuzzySearch([], "abc") = []', () => {
    expect(fuzzySearch([], 'abc', getFields)).toEqual([]);
  });
});
