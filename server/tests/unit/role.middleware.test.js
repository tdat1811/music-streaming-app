// Kiểm thử đơn vị: middleware requireRole (sheet UT17). Model User được giả lập, không cần CSDL.
jest.mock('../../src/models/User', () => ({ findOne: jest.fn() }));
const User = require('../../src/models/User');
const { requireRole } = require('../../src/middleware/auth');

// Giả lập res của Express: ghi lại mã trạng thái và nội dung trả về
const taoRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

// User.findOne(...).select(...) trả về tài khoản (hoặc null / ném lỗi)
const giaLapTaiKhoan = (user, loi) => {
  User.findOne.mockReturnValue({
    select: jest.fn(() => (loi ? Promise.reject(loi) : Promise.resolve(user))),
  });
};

const chay = async (roles, user, loi) => {
  giaLapTaiKhoan(user, loi);
  const req = { userId: 'u1' };
  const res = taoRes();
  const next = jest.fn();
  await requireRole(...roles)(req, res, next);
  return { req, res, next };
};

describe('UT17 – requireRole(...roles)', () => {
  it('UTCID01: artist gọi route chỉ dành cho artist → next(), gán req.user', async () => {
    const user = { id: 'u1', role: 'artist', artistId: 'a1' };
    const { req, res, next } = await chay(['artist'], user);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBe(user);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('UTCID02: listener gọi route artist → 403 ROLE_FORBIDDEN', async () => {
    const { res, next } = await chay(['artist'], { id: 'u1', role: 'listener' });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].code).toBe('ROLE_FORBIDDEN');
  });

  it('UTCID03: admin được phép khi route cho artist và admin', async () => {
    const { next } = await chay(['artist', 'admin'], { id: 'u1', role: 'admin' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('UTCID04: tài khoản không còn tồn tại → 401', async () => {
    const { res, next } = await chay(['artist'], null);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('UTCID05: tài khoản không có role (dữ liệu cũ) → 403', async () => {
    const { res } = await chay(['artist'], { id: 'u1' });
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('UTCID06: lỗi CSDL → 500, không gọi next', async () => {
    const { res, next } = await chay(['artist'], null, new Error('db down'));
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('UTCID07: tìm tài khoản theo req.userId (lấy từ token, không theo body)', async () => {
    await chay(['artist'], { id: 'u1', role: 'artist' });
    expect(User.findOne).toHaveBeenLastCalledWith({ id: 'u1' });
  });
});
