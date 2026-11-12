// Kiểm thử đơn vị: kiểm tra dữ liệu nhập (sheet UT08, UT09, UT10)
import { EMAIL_PATTERN, isValidPhone, validateSignUp } from '../validation';

describe('UT08 – EMAIL_PATTERN.test(email)', () => {
  it.each([
    ['UTCID01', 'ashley@example.com', true],
    ['UTCID02', 'a@b.co', true],          // ngắn nhất hợp lệ
    ['UTCID03', 'abc', false],
    ['UTCID04', 'a@b', false],            // thiếu tên miền cấp 1
    ['UTCID05', 'a b@c.com', false],      // có khoảng trắng
    ['UTCID06', '', false],
    ['UTCID07', '@example.com', false],
    ['UTCID08', 'user@mail.vn ', false],  // dư khoảng trắng cuối (màn hình sẽ trim trước)
  ])('%s: %p → %p', (_ma, email, mongDoi) => {
    expect(EMAIL_PATTERN.test(email)).toBe(mongDoi);
  });
});

describe('UT09 – validateSignUp(values)', () => {
  const HOP_LE = { name: 'Demo User', email: 'demo@example.com', password: '123456', confirmPassword: '123456' };
  const LOI = {
    name: 'Please enter your name.',
    email: 'Please enter a valid email.',
    password: 'Password must be at least 6 characters.',
    confirmPassword: 'Passwords do not match.',
  };

  it.each([
    ['UTCID01', 'dữ liệu hợp lệ', {}, {}],
    ['UTCID02', 'họ tên rỗng', { name: '' }, { name: LOI.name }],
    ['UTCID03', 'họ tên chỉ có khoảng trắng', { name: '   ' }, { name: LOI.name }],
    ['UTCID04', 'email sai định dạng', { email: 'abc' }, { email: LOI.email }],
    ['UTCID05', 'email có khoảng trắng 2 đầu', { email: '  demo@example.com  ' }, {}],
    ['UTCID06', 'mật khẩu 5 ký tự', { password: '12345', confirmPassword: '12345' }, { password: LOI.password }],
    ['UTCID07', 'xác nhận không khớp', { confirmPassword: '654321' }, { confirmPassword: LOI.confirmPassword }],
    ['UTCID08', 'sai cả 4 ô', { name: '', email: 'abc', password: '123', confirmPassword: '456' }, LOI],
  ])('%s: %s', (_ma, _moTa, thayDoi, loiMongDoi) => {
    expect(validateSignUp({ ...HOP_LE, ...thayDoi })).toEqual(loiMongDoi);
  });
});

describe('UT10 – isValidPhone(phone)', () => {
  it.each([
    ['UTCID01', '0912345678', true],
    ['UTCID02', '+84912345678', true],
    ['UTCID03', '12345678', true],            // 8 số (biên dưới)
    ['UTCID04', '123456789012345', true],     // 15 số (biên trên)
    ['UTCID05', '1234567', false],            // 7 số
    ['UTCID06', '1234567890123456', false],   // 16 số
    ['UTCID07', '12ab5678', false],           // có chữ
  ])('%s: %p → %p', (_ma, phone, mongDoi) => {
    expect(isValidPhone(phone)).toBe(mongDoi);
  });
});
