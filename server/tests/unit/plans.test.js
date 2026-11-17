// Kiểm thử đơn vị: gói hội viên ở máy chủ (sheet UT11, UT15)
const { isVipUser, addMonths, nextExpiryDate } = require('../../src/config/plans');

// Mốc thời gian cố định để kết quả không phụ thuộc ngày chạy test
const NOW = new Date('2026-11-16T10:00:00Z');
const NGAY_MAI = '2026-11-17T10:00:00Z';
const HOM_QUA = '2026-11-15T10:00:00Z';

describe('UT11 – isVipUser(user, now)', () => {
  it.each([
    ['UTCID01', { planId: 'premium', planExpiresAt: NGAY_MAI }, true],
    ['UTCID02', { planId: 'free', planExpiresAt: NGAY_MAI }, false],
    ['UTCID03', { planId: null }, false],
    ['UTCID04', {}, false],                                                  // thiếu planId
    ['UTCID05', null, false],
    ['UTCID06', { planId: 'PREMIUM', planExpiresAt: NGAY_MAI }, false],      // khác hoa thường
    ['UTCID07', { planId: 'family', planExpiresAt: NGAY_MAI }, false],       // gói không tồn tại
    ['UTCID08', { planId: 'premium', planExpiresAt: HOM_QUA }, false],       // đã hết hạn
    ['UTCID09', { planId: 'premium', planExpiresAt: null }, false],          // premium nhưng chưa có hạn
    ['UTCID10', { planId: 'premium', planExpiresAt: NOW.toISOString() }, false], // đúng thời điểm hết hạn
    ['UTCID11', { planId: 'premium', planExpiresAt: 'không phải ngày' }, false],
  ])('%s: isVipUser(%j) = %p', (_ma, user, mongDoi) => {
    expect(isVipUser(user, NOW)).toBe(mongDoi);
  });
});

describe('UT15 – addMonths(date, n) / nextExpiryDate(currentExpiresAt, now)', () => {
  const ngay = (s) => new Date(`${s}T00:00:00`);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  it.each([
    ['UTCID01', '2026-11-16', '2026-12-16'],
    ['UTCID02', '2026-01-31', '2026-02-28'], // tháng sau ngắn hơn: lấy ngày cuối tháng
    ['UTCID03', '2028-01-31', '2028-02-29'], // năm nhuận
    ['UTCID04', '2026-12-15', '2027-01-15'], // sang năm mới
  ])('%s: addMonths(%s, 1) = %s', (_ma, vao, ra) => {
    expect(iso(addMonths(ngay(vao), 1))).toBe(ra);
  });

  it('UTCID05: chưa có hạn → 1 tháng kể từ lúc thanh toán', () => {
    expect(iso(nextExpiryDate(null, ngay('2026-11-16')))).toBe('2026-12-16');
  });

  it('UTCID06: đã hết hạn → tính lại từ lúc thanh toán', () => {
    expect(iso(nextExpiryDate(ngay('2026-10-01'), ngay('2026-11-16')))).toBe('2026-12-16');
  });

  it('UTCID07: còn hạn → cộng dồn từ ngày hết hạn cũ', () => {
    expect(iso(nextExpiryDate(ngay('2026-11-20'), ngay('2026-11-16')))).toBe('2026-12-20');
  });

  it('UTCID08: không làm thay đổi ngày đầu vào', () => {
    const goc = ngay('2026-11-16');
    addMonths(goc, 1);
    expect(iso(goc)).toBe('2026-11-16');
  });
});
