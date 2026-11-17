// Kiểm thử đơn vị: trình phát nhạc (sheet UT06, UT07, UT20)
import { parseDuration, shouldCountPlay, shuffleTracks } from '../player';

describe('UT06 – parseDuration(d)', () => {
  it.each([
    ['UTCID01', '03:36', 216_000],
    ['UTCID02', '1:02:10', 3_730_000],
    ['UTCID03', '00:59', 59_000],
    ['UTCID04', '45', 45_000],          // chỉ có giây
    ['UTCID05', '0:00', 0],
    ['UTCID06', '', 0],
    ['UTCID07', undefined, 0],
    ['UTCID08', 'abc', 0],              // sai định dạng: mong đợi 0, không phải NaN
    ['UTCID09', '3:xx', 0],
  ])('%s: parseDuration(%p) = %p', (_ma, dauVao, mongDoi) => {
    expect(parseDuration(dauVao as string | undefined)).toBe(mongDoi);
  });
});

describe('UT07 – shuffleTracks(tracks)', () => {
  const track = (id: string) => ({ id, title: id, artist: '', coverImage: null });

  afterEach(() => jest.restoreAllMocks());

  it('UTCID01: trả mảng mới đủ 5 bài, không sửa mảng đầu vào', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0); // cố định kết quả xáo
    const input = ['s1', 's2', 's3', 's4', 's5'].map(track);
    const ketQua = shuffleTracks(input);
    expect(ketQua).not.toBe(input);
    expect(ketQua.map((t) => t.id).sort()).toEqual(['s1', 's2', 's3', 's4', 's5']);
    expect(input.map((t) => t.id)).toEqual(['s1', 's2', 's3', 's4', 's5']);
  });

  it('UTCID02: mảng rỗng trả mảng rỗng', () => {
    expect(shuffleTracks([])).toEqual([]);
  });

  it('UTCID03: một bài thì giữ nguyên', () => {
    expect(shuffleTracks([track('s1')]).map((t) => t.id)).toEqual(['s1']);
  });
});

describe('UT20 – shouldCountPlay(currentSec, durationSec)', () => {
  it.each([
    ['UTCID01', 30, 200, true],     // đủ 30 giây
    ['UTCID02', 29.9, 200, false],  // chưa đủ 30 giây
    ['UTCID03', 20, 40, true],      // bài 40 giây: nửa bài = 20 giây
    ['UTCID04', 19, 40, false],
    ['UTCID05', 30, 0, true],       // chưa biết thời lượng: dùng mốc 30 giây
    ['UTCID06', 10, NaN, false],
    ['UTCID07', 0, 200, false],     // chưa phát
    ['UTCID08', NaN, 200, false],
  ])('%s: shouldCountPlay(%p, %p) = %p', (_ma, current, duration, mongDoi) => {
    expect(shouldCountPlay(current, duration)).toBe(mongDoi);
  });
});
