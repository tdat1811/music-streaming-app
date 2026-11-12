// Tiện ích gọi API trong test tích hợp và ghi lại kết quả thực tế cho file Excel.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../../src/app');

const api = () => request(app);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

// Đăng nhập và trả về token JWT
async function dangNhap(email, password = '123456') {
  const res = await api().post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`Đăng nhập ${email} thất bại: ${res.status}`);
  return res.body.token;
}

// Ghi "kết quả thực tế" của từng test case (đọc lại khi điền cột Kết quả thực tế trong Excel).
// Gọi TRƯỚC các expect để vẫn có dữ liệu khi test Fail.
const OUT_DIR = path.join(__dirname, '..', 'output', 'ket-qua-thuc-te');
function ghiKetQua(maTest, noiDung) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `${maTest}.txt`), noiDung, 'utf8');
}

module.exports = { api, auth, dangNhap, ghiKetQua };
