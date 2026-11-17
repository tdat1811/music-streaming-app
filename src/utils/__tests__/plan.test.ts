// Kiểm thử đơn vị: gói VIP có thời hạn ở app (sheet UT19)
import { addMonths, daysLeft, formatDate, isPlanActive, nextExpiryDate } from '../plan';

const NOW = new Date(2026, 10, 16, 10, 0, 0); // 16/11/2026 10:00 (giờ máy)
const sauNgay = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

describe('UT19 – isPlanActive(planId, expiresAt, now)', () => {
  it.each([
    ['UTCID01', 'premium', sauNgay(1).toISOString(), true],
    ['UTCID02', 'premium', sauNgay(-1).toISOString(), false], // đã hết hạn
    ['UTCID03', 'premium', null, false],                      // chưa có hạn
    ['UTCID04', 'free', sauNgay(30).toISOString(), false],    // gói Free không phải VIP
    ['UTCID05', null, sauNgay(30).toISOString(), false],
    ['UTCID06', 'premium', NOW.toISOString(), false],         // đúng thời điểm hết hạn
    ['UTCID07', 'premium', 'abc', false],                     // ngày không hợp lệ
  ])('%s: isPlanActive(%p, %p) = %p', (_ma, planId, expiresAt, mongDoi) => {
    expect(isPlanActive(planId, expiresAt, NOW)).toBe(mongDoi);
  });
});

describe('UT19 – addMonths / nextExpiryDate / formatDate / daysLeft', () => {
  it('UTCID08: 31/01 + 1 tháng = 28/02 (không nhảy sang tháng 3)', () => {
    expect(formatDate(addMonths(new Date(2026, 0, 31), 1))).toBe('28/02/2026');
  });

  it('UTCID09: chưa có hạn → hết hạn 1 tháng sau khi thanh toán', () => {
    expect(formatDate(nextExpiryDate(null, NOW))).toBe('16/12/2026');
  });

  it('UTCID10: còn hạn đến 20/11 → gia hạn đến 20/12', () => {
    expect(formatDate(nextExpiryDate(new Date(2026, 10, 20), NOW))).toBe('20/12/2026');
  });

  it('UTCID11: đã hết hạn → tính lại từ hôm nay', () => {
    expect(formatDate(nextExpiryDate(new Date(2026, 9, 1), NOW))).toBe('16/12/2026');
  });

  it.each([
    ['UTCID12', sauNgay(30), 30],
    ['UTCID13', sauNgay(0.5), 1],  // còn nửa ngày vẫn tính 1 ngày
    ['UTCID14', sauNgay(-2), 0],   // hết hạn -> 0
    ['UTCID15', null, 0],
  ])('%s: daysLeft(%p) = %p', (_ma, expiresAt, mongDoi) => {
    expect(daysLeft(expiresAt, NOW)).toBe(mongDoi);
  });

  it('UTCID16: formatDate không đọc được ngày → chuỗi rỗng', () => {
    expect(formatDate('không phải ngày')).toBe('');
    expect(formatDate(undefined)).toBe('');
  });
});
