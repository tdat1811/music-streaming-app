// Kiểm thử tích hợp: Tài khoản (IT01–IT10) – API ↔ MongoDB
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { api, auth, dangNhap, ghiKetQua } = require('../helpers/api');
const { moDb, lamMoiDuLieu, dongDb } = require('../helpers/db');
const User = require('../../src/models/User');

beforeAll(moDb);
beforeEach(lamMoiDuLieu);
afterAll(dongDb);

describe('Tài khoản – đăng ký, đăng nhập, hồ sơ, mật khẩu', () => {
  test('IT01: đăng ký hợp lệ → 201, có token, không trả mật khẩu; CSDL lưu mật khẩu đã băm', async () => {
    const res = await api().post('/api/auth/register')
      .send({ name: 'Demo User', email: 'demo@example.com', password: '123456' });
    const user = await User.findOne({ email: 'demo@example.com' });
    ghiKetQua('IT01', `${res.status}; token: ${res.body.token ? 'có' : 'không'}; data.password: ${res.body.data?.password === undefined ? 'không trả về' : 'CÓ trả về'}; CSDL: password ${/^\$2[aby]\$/.test(user?.password || '') ? 'là chuỗi bcrypt' : 'KHÔNG băm'}, planId = ${user?.planId}`);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.data.password).toBeUndefined();
    expect(user.password).toMatch(/^\$2[aby]\$/);
    expect(user.planId).toBeNull();
  });

  test('IT02: đăng ký email đã có (khác hoa thường) → 400, không tạo thêm tài khoản', async () => {
    const res = await api().post('/api/auth/register')
      .send({ name: 'Ashley 2', email: 'ASHLEY@Example.com', password: '123456' });
    const soUser = await User.countDocuments();
    ghiKetQua('IT02', `${res.status} "${res.body.message}"; số tài khoản: ${soUser}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email này đã được sử dụng.');
    expect(soUser).toBe(2);
  });

  test('IT03: mật khẩu 5 ký tự → 400, không tạo tài khoản', async () => {
    const res = await api().post('/api/auth/register')
      .send({ name: 'Demo', email: 'demo2@example.com', password: '12345' });
    const user = await User.findOne({ email: 'demo2@example.com' });
    ghiKetQua('IT03', `${res.status} "${res.body.message}"; tài khoản trong CSDL: ${user ? 'CÓ' : 'không có'}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Mật khẩu phải có ít nhất 6 ký tự.');
    expect(user).toBeNull();
  });

  test('IT04: đăng nhập đúng → 200, có token JWT, không trả mật khẩu', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'ashley@example.com', password: '123456' });
    ghiKetQua('IT04', `${res.status}; token: ${res.body.token ? res.body.token.split('.').length + ' phần (JWT)' : 'không có'}; data.password: ${res.body.data?.password === undefined ? 'không trả về' : 'CÓ trả về'}`);

    expect(res.status).toBe(200);
    expect(res.body.token.split('.')).toHaveLength(3);
    expect(res.body.data.password).toBeUndefined();
  });

  test('IT05: sai mật khẩu và email không tồn tại → cùng 401, cùng thông báo', async () => {
    const saiMatKhau = await api().post('/api/auth/login').send({ email: 'ashley@example.com', password: 'sai123' });
    const khongCoEmail = await api().post('/api/auth/login').send({ email: 'khongco@example.com', password: '123456' });
    ghiKetQua('IT05', `Sai mật khẩu: ${saiMatKhau.status} "${saiMatKhau.body.message}"; Email không tồn tại: ${khongCoEmail.status} "${khongCoEmail.body.message}"`);

    expect(saiMatKhau.status).toBe(401);
    expect(khongCoEmail.status).toBe(401);
    expect(saiMatKhau.body.message).toBe('Email hoặc mật khẩu không chính xác.');
    expect(khongCoEmail.body.message).toBe(saiMatKhau.body.message);
  });

  test('IT06: cập nhật hồ sơ không có token → 401 TOKEN_MISSING, CSDL không đổi', async () => {
    const res = await api().put('/api/auth/profile').send({ name: 'Hacker' });
    const ashley = await User.findOne({ id: 'u_ashley' });
    ghiKetQua('IT06', `${res.status} code = ${res.body.code}; tên trong CSDL: "${ashley.name}"`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_MISSING');
    expect(ashley.name).toBe('Ashley Scott');
  });

  test('IT07: token hết hạn → 401 TOKEN_EXPIRED, không thả tim', async () => {
    const tokenHetHan = jwt.sign({ userId: 'u_ashley' }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await api().post('/api/auth/like-song').set(auth(tokenHetHan)).send({ songId: 's1' });
    const ashley = await User.findOne({ id: 'u_ashley' });
    ghiKetQua('IT07', `${res.status} code = ${res.body.code}; likedSongIds: [${ashley.likedSongIds.join(', ')}]`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
    expect(ashley.likedSongIds).toEqual([]);
  });

  test('IT08: đổi email trùng tài khoản khác → 400, email không đổi', async () => {
    const token = await dangNhap('ashley@example.com');
    const res = await api().put('/api/auth/profile').set(auth(token)).send({ email: 'jason@example.com' });
    const ashley = await User.findOne({ id: 'u_ashley' });
    ghiKetQua('IT08', `${res.status} "${res.body.message}"; email của Ashley: ${ashley.email}`);

    expect(res.status).toBe(400);
    expect(ashley.email).toBe('ashley@example.com');
  });

  test('IT09: đổi mật khẩu với mật khẩu hiện tại sai → 401, mật khẩu không đổi', async () => {
    const token = await dangNhap('ashley@example.com');
    const truoc = (await User.findOne({ id: 'u_ashley' })).password;
    const res = await api().put('/api/auth/change-password').set(auth(token))
      .send({ currentPassword: 'sai999', newPassword: '654321' });
    const sau = (await User.findOne({ id: 'u_ashley' })).password;
    ghiKetQua('IT09', `${res.status} "${res.body.message}"; hash mật khẩu ${truoc === sau ? 'không đổi' : 'BỊ ĐỔI'}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Mật khẩu hiện tại không chính xác.');
    expect(sau).toBe(truoc);
  });

  test('IT10: đổi mật khẩu đúng → mật khẩu cũ bị từ chối, mật khẩu mới đăng nhập được', async () => {
    const token = await dangNhap('ashley@example.com');
    const doi = await api().put('/api/auth/change-password').set(auth(token))
      .send({ currentPassword: '123456', newPassword: '654321' });
    const cu = await api().post('/api/auth/login').send({ email: 'ashley@example.com', password: '123456' });
    const moi = await api().post('/api/auth/login').send({ email: 'ashley@example.com', password: '654321' });
    const hash = (await User.findOne({ id: 'u_ashley' })).password;
    ghiKetQua('IT10', `Đổi mật khẩu: ${doi.status}; đăng nhập mật khẩu cũ: ${cu.status}; mật khẩu mới: ${moi.status}; hash khớp mật khẩu mới: ${await bcrypt.compare('654321', hash)}`);

    expect(doi.status).toBe(200);
    expect(cu.status).toBe(401);
    expect(moi.status).toBe(200);
    expect(await bcrypt.compare('654321', hash)).toBe(true);
  });
});
