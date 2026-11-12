// Database tạm cho kiểm thử tích hợp: MongoDB chạy trong bộ nhớ, không bao giờ đụng tới Atlas.
const fs = require('fs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { seedTestData } = require('./seed');

// Dùng MongoDB đã cài trên máy nếu có (khỏi tải); máy khác sẽ tự tải bản phù hợp
const LOCAL_MONGOD = process.env.MONGOMS_SYSTEM_BINARY || 'C:/Program Files/MongoDB/Server/6.0/bin/mongod.exe';

let mongo;

async function moDb() {
  const binary = fs.existsSync(LOCAL_MONGOD)
    ? { systemBinary: LOCAL_MONGOD, version: process.env.MONGOMS_VERSION || '6.0.8' }
    : {};
  mongo = await MongoMemoryServer.create({ binary });
  const uri = mongo.getUri();
  // Chốt an toàn: chỉ chấp nhận database trên chính máy này
  if (!/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(uri)) {
    throw new Error(`Từ chối chạy test trên database không phải database tạm: ${uri}`);
  }
  await mongoose.connect(uri, { dbName: 'music_streaming_test' });
  return uri;
}

// Mỗi test bắt đầu từ cùng một bộ dữ liệu mẫu sạch
async function lamMoiDuLieu() {
  await mongoose.connection.dropDatabase();
  await seedTestData();
}

async function dongDb() {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}

module.exports = { moDb, lamMoiDuLieu, dongDb };
