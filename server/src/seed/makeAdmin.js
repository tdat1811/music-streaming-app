// Nâng một tài khoản có sẵn lên Admin (app không có nút "đăng ký admin").
//   npm run make-admin -- <email>            nâng lên admin
//   npm run make-admin -- <email> --revoke   hạ về listener
// Tài khoản đang là nghệ sĩ thì không đổi (tránh mất liên kết với trang nghệ sĩ).
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const run = async (email, revoke) => {
  const User = require('../models/User');
  const user = await User.findOne({ email: String(email).trim().toLowerCase() });
  if (!user) throw new Error(`Không tìm thấy tài khoản ${email}`);
  if (user.role === 'artist') throw new Error(`${email} đang là nghệ sĩ, không đổi role.`);
  user.role = revoke ? 'listener' : 'admin';
  await user.save();
  return user;
};

module.exports = { run };

if (require.main === module) {
  dotenv.config();
  const connectDB = require('../config/db');
  const [email] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const revoke = process.argv.includes('--revoke');
  if (!email) {
    console.error('Cách dùng: npm run make-admin -- <email> [--revoke]');
    process.exit(1);
  }
  (async () => {
    await connectDB();
    const user = await run(email, revoke);
    console.log(`✅ ${user.email} giờ có role = ${user.role}`);
    await mongoose.disconnect();
  })().catch(async (err) => {
    console.error('❌', err.message);
    await mongoose.disconnect();
    process.exit(1);
  });
}
