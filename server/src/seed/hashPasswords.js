// Mã hoá bằng bcrypt các mật khẩu còn lưu dạng chữ thường trong database.
// Không xoá hay thay đổi dữ liệu nào khác; mật khẩu đăng nhập của người dùng giữ nguyên.
//   npm run hash-passwords -- --dry-run   (chỉ liệt kê, không ghi)
//   npm run hash-passwords                (ghi vào database)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');

dotenv.config();

const SALT_ROUNDS = 10;
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;
const dryRun = process.argv.includes('--dry-run');

const run = async () => {
  await connectDB();
  const users = await User.find({});
  const plain = users.filter((u) => !BCRYPT_HASH.test(u.password || ''));

  console.log(`Tổng số tài khoản: ${users.length}, cần mã hoá: ${plain.length}`);
  for (const user of plain) {
    console.log(`  - ${user.email}${dryRun ? ' (dry-run, chưa ghi)' : ''}`);
    if (!dryRun) {
      user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
      await user.save();
    }
  }
  console.log(dryRun ? 'Dry-run xong, database không thay đổi.' : '✅ Đã mã hoá xong.');
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error('❌ Lỗi:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
