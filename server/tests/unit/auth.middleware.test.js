// Kiểm thử đơn vị: middleware xác thực JWT (sheet UT12, UT13)
// Khoá ký phải được đặt trước khi nạp middleware vì auth.js đọc JWT_SECRET lúc nạp.
process.env.JWT_SECRET = 'test-secret';
const jwt = require('jsonwebtoken');
const { signToken, requireAuth, requireSelf } = require('../../src/middleware/auth');

// res giả: ghi lại mã trạng thái và nội dung trả về
const taoRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('UT12 – requireAuth(req, res, next)', () => {
  const tokenHopLe = signToken('u1');
  const tokenHetHan = jwt.sign({ userId: 'u1' }, 'test-secret', { expiresIn: -10 });
  const tokenKhoaKhac = jwt.sign({ userId: 'u1' }, 'khoa-khac');

  it('UTCID01: token hợp lệ → gọi next(), req.userId = "u1"', () => {
    const req = { headers: { authorization: `Bearer ${tokenHopLe}` } };
    const res = taoRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBe('u1');
    expect(res.status).not.toHaveBeenCalled();
  });

  // Cột: mã, mô tả, mã lỗi mong đợi, header Authorization gửi lên
  it.each([
    ['UTCID02', 'không có header', 'TOKEN_MISSING', undefined],
    ['UTCID03', 'thiếu chữ Bearer', 'TOKEN_MISSING', tokenHopLe],
    ['UTCID04', 'scheme Basic', 'TOKEN_MISSING', `Basic ${tokenHopLe}`],
    ['UTCID05', '"Bearer " không có token', 'TOKEN_MISSING', 'Bearer '],
    ['UTCID06', '"bearer" viết thường', 'TOKEN_MISSING', `bearer ${tokenHopLe}`],
    ['UTCID07', 'token hết hạn', 'TOKEN_EXPIRED', `Bearer ${tokenHetHan}`],
    ['UTCID08', 'token ký bằng khoá khác', 'TOKEN_INVALID', `Bearer ${tokenKhoaKhac}`],
    ['UTCID09', 'token hỏng', 'TOKEN_INVALID', 'Bearer abc.def.ghi'],
  ])('%s: %s → 401 %s, không gọi next()', (_ma, _moTa, maLoi, header) => {
    const req = { headers: header === undefined ? {} : { authorization: header } };
    const res = taoRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: maLoi }));
    expect(next).not.toHaveBeenCalled();
  });
});

describe('UT13 – requireSelf(req, res, next)', () => {
  it('UTCID01: userId trên đường dẫn trùng với token → next()', () => {
    const res = taoRes();
    const next = jest.fn();
    requireSelf({ params: { userId: 'u1' }, userId: 'u1' }, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['UTCID02', 'u2'],
    ['UTCID03', ''],
  ])('%s: params.userId = %p khác người đăng nhập → 403', (_ma, userIdTrenDuongDan) => {
    const res = taoRes();
    const next = jest.fn();
    requireSelf({ params: { userId: userIdTrenDuongDan }, userId: 'u1' }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
