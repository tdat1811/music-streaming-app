// Kiểm thử đơn vị: lượt nghe và xếp hạng bảng xếp hạng (sheet UT04, UT05, UT18)
import { formatCount, formatFollowers, parsePlays, sortByPlays } from '../plays';

describe('UT04 – parsePlays(plays)', () => {
  it.each([
    ['UTCID01', '12.8M', 12_800_000],
    ['UTCID02', '850K', 850_000],
    ['UTCID03', '1.2B', 1_200_000_000],
    ['UTCID04', '2,1M', 2_100_000],       // dấu phẩy thập phân
    ['UTCID05', '12,345', 12_345],        // dấu phân cách nghìn
    ['UTCID06', 5000, 5000],              // kiểu number
    ['UTCID07', '  3.4m  ', 3_400_000],   // chữ thường, có khoảng trắng
    ['UTCID08', '', 0],
    ['UTCID09', undefined, 0],
    ['UTCID10', 'abc', 0],
    ['UTCID11', NaN, 0],
  ])('%s: parsePlays(%p) = %p', (_ma, dauVao, mongDoi) => {
    expect(parsePlays(dauVao)).toBe(mongDoi);
  });
});

describe('UT05 – sortByPlays(songs)', () => {
  const ids = (list: { id: string }[]) => list.map((s) => s.id);
  const song = (id: string, plays?: string) => ({ id, plays, title: id, artist: '', coverImage: null });

  it('UTCID01: sắp giảm dần theo lượt nghe, bài không có plays xếp cuối', () => {
    const input = [song('a', '1.2M'), song('b', '15.8M'), song('c'), song('d', '850K'), song('e', '2,1M')];
    expect(ids(sortByPlays(input))).toEqual(['b', 'e', 'a', 'd', 'c']);
  });

  it('UTCID02: lượt nghe bằng nhau thì giữ thứ tự ban đầu', () => {
    expect(ids(sortByPlays([song('x', '1M'), song('y', '1M')]))).toEqual(['x', 'y']);
  });

  it('UTCID03: mảng rỗng trả mảng rỗng', () => {
    expect(sortByPlays([])).toEqual([]);
  });

  it('UTCID04: không sửa mảng gốc', () => {
    const input = [song('p', '1K'), song('q', '2K')];
    const ketQua = sortByPlays(input);
    expect(ids(ketQua)).toEqual(['q', 'p']);
    expect(ids(input)).toEqual(['p', 'q']);
  });
});

describe('UT18 – formatCount(value) / formatFollowers(artist)', () => {
  it.each([
    ['UTCID01', 12_800_000, '12.8M'],
    ['UTCID02', 950_000, '950K'],
    ['UTCID03', 1_000_000, '1M'],          // tròn số: không có ".0"
    ['UTCID04', 999_999, '999.9K'],        // cắt bớt, không làm tròn lên thành 1000K
    ['UTCID05', 1_500, '1.5K'],
    ['UTCID06', 999, '999'],
    ['UTCID07', 0, '0'],                   // bài mới tải lên
    ['UTCID08', 2_500_000_000, '2.5B'],
    ['UTCID09', '12.8M', '12.8M'],         // dữ liệu cũ dạng chuỗi
    ['UTCID10', -5, '0'],
    ['UTCID11', undefined, '0'],
  ])('%s: formatCount(%p) = %p', (_ma, vao, ra) => {
    expect(formatCount(vao)).toBe(ra);
  });

  it.each([
    ['UTCID12', { followersCount: 85_400_000 }, '85.4M Followers'],
    ['UTCID13', { followersCount: 0 }, '0 Followers'],
    ['UTCID14', { followers: '1.2M Followers' }, '1.2M Followers'],     // dữ liệu mẫu cũ
    ['UTCID15', { followersCount: 10, followers: '1M Followers' }, '10 Followers'], // ưu tiên số
    ['UTCID16', {}, ''],
    ['UTCID17', null, ''],
  ])('%s: formatFollowers(%j) = %p', (_ma, artist, ra) => {
    expect(formatFollowers(artist)).toBe(ra);
  });
});
