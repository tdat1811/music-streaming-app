// Máy chủ thật dùng cho kiểm thử App ↔ API: Express + MongoDB tạm (không bao giờ dùng Atlas).
// In ra "READY <mongo-uri>" khi sẵn sàng. JWT_SECRET đọc từ biến môi trường (mặc định test-secret).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const { moDb, lamMoiDuLieu } = require('../helpers/db');
const app = require('../../src/app');

const PORT = Number(process.env.PORT_TEST || 5000);

(async () => {
  const uri = await moDb();
  await lamMoiDuLieu();
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`READY ${uri}music_streaming_test`);
  });
})().catch((err) => {
  console.error('Không khởi động được máy chủ test:', err);
  process.exit(1);
});
