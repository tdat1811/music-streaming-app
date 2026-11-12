// Điểm khởi chạy máy chủ: kết nối MongoDB rồi lắng nghe cổng.
// Cấu hình Express nằm ở app.js (được test import trực tiếp).
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./config/db');
const app = require('./app');

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Music Streaming API Server is running on port ${PORT}`);
  console.log(`🔗 Local URL: http://localhost:${PORT}/api/health`);
});
