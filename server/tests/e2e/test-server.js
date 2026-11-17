// Máy chủ thật dùng cho kiểm thử App ↔ API: Express + MongoDB tạm (không bao giờ dùng Atlas).
// In ra "READY <mongo-uri>" khi sẵn sàng. JWT_SECRET đọc từ biến môi trường (mặc định test-secret).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const { moDb, lamMoiDuLieu } = require('../helpers/db');
const app = require('../../src/app');
// Không bao giờ gọi Gemini thật khi chạy kiểm thử: dùng client giả trả JSON mẫu (giai đoạn 6)
const { fakeGeminiClient, setFakeGeminiMode } = require('../helpers/fakeGemini');
require('../../src/services/gemini').setGeminiClient(fakeGeminiClient());

const PORT = Number(process.env.PORT_TEST || 5000);

// Cổng điều khiển chỉ có ở máy chủ test (PORT_TEST + 1, chỉ nghe 127.0.0.1): đổi chế độ Gemini giả lập
// để E2E dựng được màn "model quá tải" (giai đoạn 6b). VD: GET http://127.0.0.1:5056/gemini-mode/primary_down
require('http')
  .createServer((req, res) => {
    const m = /^\/gemini-mode\/(ok|error|quota|blocked|invalid|primary_down|lite_down|busy)$/.exec(req.url || '');
    if (m) setFakeGeminiMode(m[1]);
    res.writeHead(m ? 200 : 404, { 'Content-Type': 'text/plain' });
    res.end(m ? `mode=${m[1]}` : 'not found');
  })
  .listen(PORT + 1, '127.0.0.1');

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
