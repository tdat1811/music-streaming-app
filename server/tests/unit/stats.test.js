// Kiểm thử đơn vị: tiện ích thống kê nghệ sĩ – giai đoạn 4 (sheet UT34)
const {
  parseRange,
  parseTz,
  normalizeSource,
  dayKey,
  startOfDay,
  rangeWindow,
  percentChange,
  bucketByDay,
  lastMonthKeys,
  sourceBreakdown,
  PLAY_DEDUPE_MS,
  PLAY_RATE_LIMIT,
} = require('../../src/utils/stats');
const { allowRequest, resetPlayLimiter, listenerKeyOf } = require('../../src/services/playEvents');

describe('UT34 – percentChange(current, previous)', () => {
  it.each([
    ['UTCID01', 118, 100, 18],
    ['UTCID02', 80, 100, -20],
    ['UTCID03', 5, 4, 25],
    ['UTCID04', 0, 0, 0],
    ['UTCID05', 7, 0, null],       // kỳ trước = 0: không tính được %
    ['UTCID06', 0, 10, -100],
    ['UTCID07', 3, -2, 250],       // người theo dõi ròng kỳ trước âm
  ])('%s: %d so với %d → %s', (_ma, cur, prev, mongDoi) => {
    expect(percentChange(cur, prev)).toBe(mongDoi);
  });
});

describe('UT34 – khoảng thời gian và múi giờ', () => {
  const now = new Date('2026-11-16T03:30:00Z'); // 10:30 ngày 16/11 giờ Việt Nam

  it('UTCID08: dayKey theo giờ người xem (23:30 UTC ngày 15 = ngày 16 ở Việt Nam)', () => {
    expect(dayKey(new Date('2026-11-15T23:30:00Z'), 420)).toBe('2026-11-16');
    expect(dayKey(new Date('2026-11-15T23:30:00Z'), 0)).toBe('2026-11-15');
  });

  it('UTCID09: startOfDay = 00:00 giờ Việt Nam = 17:00 UTC hôm trước', () => {
    expect(startOfDay(now, 420).toISOString()).toBe('2026-11-15T17:00:00.000Z');
  });

  it('UTCID10: rangeWindow(7) gồm hôm nay + 6 ngày trước, kỳ trước liền kề cùng độ dài', () => {
    const w = rangeWindow(7, now, 420);
    expect(w.to.toISOString()).toBe('2026-11-16T17:00:00.000Z');
    expect(w.from.toISOString()).toBe('2026-11-09T17:00:00.000Z');
    expect(w.prevFrom.toISOString()).toBe('2026-11-02T17:00:00.000Z');
    expect(w.prevTo).toEqual(w.from);
  });

  it('UTCID11: bucketByDay luôn đủ số ngày, ngày trống = 0', () => {
    const w = rangeWindow(7, now, 420);
    const series = bucketByDay([now, now, new Date('2026-11-14T05:00:00Z')], w.from, 7, 420);
    expect(series.map((p) => p.key)).toEqual(['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16']);
    expect(series.map((p) => p.plays)).toEqual([0, 0, 0, 0, 1, 0, 2]);
  });

  it('UTCID12: lastMonthKeys trả 12 tháng, qua cả năm trước', () => {
    const keys = lastMonthKeys(now, 12, 420);
    expect(keys).toHaveLength(12);
    expect([keys[0], keys[1], keys[11]]).toEqual(['2025-12', '2026-01', '2026-11']);
  });

  it.each([
    ['UTCID13', '30', '30'],
    ['UTCID14', 'all', 'all'],
    ['UTCID15', '90', '7'],        // giá trị lạ → mặc định 7 ngày
    ['UTCID16', undefined, '7'],
  ])('%s: parseRange(%j) → %s', (_ma, vao, ra) => {
    expect(parseRange(vao)).toBe(ra);
  });

  it('UTCID17: parseTz – hợp lệ thì dùng, sai / thiếu thì giờ Việt Nam (420)', () => {
    expect([parseTz('0'), parseTz('-300'), parseTz('abc'), parseTz(undefined), parseTz('9999')]).toEqual([0, -300, 420, 420, 420]);
  });
});

describe('UT34 – nguồn lượt nghe', () => {
  it('UTCID18: normalizeSource – nguồn lạ / thiếu thành "other"', () => {
    expect(['search', 'feed', 'hack<script>', undefined].map(normalizeSource)).toEqual(['search', 'feed', 'other', 'other']);
  });

  it('UTCID19: sourceBreakdown xếp giảm dần, tính %, bỏ nguồn 0', () => {
    expect(sourceBreakdown({ feed: 2, search: 3, album: 0 })).toEqual([
      { source: 'search', plays: 3, percent: 60 },
      { source: 'feed', plays: 2, percent: 40 },
    ]);
  });

  it('UTCID20: sourceBreakdown với tổng cho trước (All time có lượt nghe cũ)', () => {
    expect(sourceBreakdown({ search: 25, unknown: 75 }, 100)[0]).toEqual({ source: 'unknown', plays: 75, percent: 75 });
  });
});

describe('UT34 – chống tăng lượt nghe ảo', () => {
  beforeEach(resetPlayLimiter);

  it('UTCID21: luật 10 phút và 60 yêu cầu / phút', () => {
    expect(PLAY_DEDUPE_MS).toBe(10 * 60 * 1000);
    expect(PLAY_RATE_LIMIT).toEqual({ max: 60, windowMs: 60000 });
  });

  it('UTCID22: allowRequest – 60 lần đầu được, lần 61 bị chặn, sau 1 phút được lại; IP khác không ảnh hưởng', () => {
    const t = 1000000;
    const ket = Array.from({ length: 61 }, (_, i) => allowRequest('1.1.1.1', t + i));
    expect(ket.filter(Boolean)).toHaveLength(60);
    expect(ket[60]).toBe(false);
    expect(allowRequest('2.2.2.2', t + 61)).toBe(true);
    expect(allowRequest('1.1.1.1', t + 60001 + 60)).toBe(true);
  });

  it('UTCID23: listenerKeyOf – tài khoản dùng id, khách dùng mã băm IP (không lộ IP)', () => {
    expect(listenerKeyOf('u_jason', '9.9.9.9')).toBe('u:u_jason');
    const khach = listenerKeyOf(null, '9.9.9.9');
    expect(khach).toMatch(/^ip:[0-9a-f]{16}$/);
    expect(khach).not.toContain('9.9.9.9');
    expect(listenerKeyOf(null, '9.9.9.9')).toBe(khach);
  });
});
