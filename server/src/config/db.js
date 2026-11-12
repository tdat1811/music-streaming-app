const dns = require('dns');
const mongoose = require('mongoose');

// Chuỗi mongodb+srv:// cần tra bản ghi DNS loại SRV. Một số router trả lỗi
// "querySrv EBADRESP" với loại này, nên hỏi DNS công cộng trước, vẫn giữ DNS
// của máy làm dự phòng. Có thể đổi bằng biến DNS_SERVERS=8.8.8.8,1.1.1.1 trong .env
const useReliableDnsForSrv = (uri) => {
  if (!uri || !uri.startsWith('mongodb+srv://')) return;
  const preferred = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const current = dns.getServers().filter((s) => !preferred.includes(s));
  dns.setServers([...preferred, ...current]);
};

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/music_streaming_db';
    useReliableDnsForSrv(uri);
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
