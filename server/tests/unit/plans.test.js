// Kiểm thử đơn vị: xác định tài khoản VIP ở máy chủ (sheet UT11)
const { isVipUser } = require('../../src/config/plans');

describe('UT11 – isVipUser(user)', () => {
  it.each([
    ['UTCID01', { planId: 'premium' }, true],
    ['UTCID02', { planId: 'free' }, false],
    ['UTCID03', { planId: null }, false],
    ['UTCID04', {}, false],                        // thiếu planId
    ['UTCID05', null, false],
    ['UTCID06', { planId: 'PREMIUM' }, false],     // khác hoa thường
    ['UTCID07', { planId: 'family' }, false],      // gói không tồn tại
  ])('%s: isVipUser(%j) = %p', (_ma, user, mongDoi) => {
    expect(isVipUser(user)).toBe(mongDoi);
  });
});
