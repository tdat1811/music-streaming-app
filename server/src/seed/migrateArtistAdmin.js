// Chuyển database đang chạy (VD MongoDB Atlas) sang cấu trúc mới chuẩn bị cho role Artist / Admin.
// KHÔNG xoá dữ liệu, chạy lại nhiều lần vẫn an toàn (chỉ sửa bản ghi còn ở dạng cũ):
//   - Song.plays "12.8M" -> 12800000; thêm artistId, status = 'published'
//   - Album: thêm artistId, status = 'published'
//   - Artist.followers "85.4M Followers" -> followersCount; thêm ownerUserId = null
//   - FeedPost: thêm authorArtistId (theo authorName)
//   - User: thêm role = 'listener', artistId = null; gói premium chưa có hạn -> hạn 1 tháng từ hôm nay
//
//   npm run migrate:artist -- --dry-run   (chỉ đếm, không ghi)
//   npm run migrate:artist                (ghi vào database)
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { parseCount, buildArtistResolver } = require('../utils/legacyData');
const { addMonths, PLAN_DURATION_MONTHS, VIP_PLAN_IDS } = require('../config/plans');

const missing = (field) => ({ $or: [{ [field]: { $exists: false } }, { [field]: null }] });

// Dùng collection thô (không qua Mongoose schema) để đọc được giá trị kiểu cũ như plays: "12.8M"
const migrate = async (db, { dryRun = false, now = new Date() } = {}) => {
  const col = (name) => db.collection(name);
  const summary = {};
  const write = async (name, ops) => {
    summary[name] = ops.length;
    if (!dryRun && ops.length) await col(name).bulkWrite(ops, { ordered: false });
  };

  const artists = await col('artists').find({}, { projection: { id: 1, name: 1 } }).toArray();
  const resolveArtistId = buildArtistResolver(artists);

  // Artists
  const artistOps = [];
  for (const a of await col('artists').find({ $or: [missing('followersCount'), { followers: { $exists: true } }, { ownerUserId: { $exists: false } }, { socialLinks: { $type: 'object' } }] }).toArray()) {
    const set = {};
    // socialLinks bản cũ là object {facebook, instagram...}: đổi sang mảng link
    if (a.socialLinks && !Array.isArray(a.socialLinks)) set.socialLinks = Object.values(a.socialLinks).filter(Boolean);
    if (a.followersCount === undefined || a.followersCount === null) set.followersCount = parseCount(a.followers);
    if (a.ownerUserId === undefined) set.ownerUserId = null;
    const update = { $set: set };
    if (a.followers !== undefined) update.$unset = { followers: '' };
    artistOps.push({ updateOne: { filter: { _id: a._id }, update } });
  }
  await write('artists', artistOps);

  // Songs
  const songOps = [];
  for (const s of await col('songs').find({ $or: [{ plays: { $type: 'string' } }, missing('plays'), { artistId: { $exists: false } }, missing('status')] }).toArray()) {
    const set = {};
    if (typeof s.plays !== 'number') set.plays = parseCount(s.plays);
    if (s.artistId === undefined) set.artistId = resolveArtistId(s.artist);
    if (!s.status) set.status = 'published';
    songOps.push({ updateOne: { filter: { _id: s._id }, update: { $set: set } } });
  }
  await write('songs', songOps);

  // Albums
  const albumOps = [];
  for (const al of await col('albums').find({ $or: [{ artistId: { $exists: false } }, missing('status')] }).toArray()) {
    const set = {};
    if (al.artistId === undefined) set.artistId = resolveArtistId(al.artist);
    if (!al.status) set.status = 'published';
    albumOps.push({ updateOne: { filter: { _id: al._id }, update: { $set: set } } });
  }
  await write('albums', albumOps);

  // Feed posts
  const postOps = [];
  for (const p of await col('feedposts').find({ authorArtistId: { $exists: false } }).toArray()) {
    postOps.push({ updateOne: { filter: { _id: p._id }, update: { $set: { authorArtistId: resolveArtistId(p.authorName) } } } });
  }
  await write('feedposts', postOps);

  // Users
  const expiresAt = addMonths(now, PLAN_DURATION_MONTHS);
  const userOps = [];
  for (const u of await col('users').find({ $or: [{ role: { $exists: false } }, { artistId: { $exists: false } }, { planExpiresAt: { $exists: false } }] }).toArray()) {
    const set = {};
    if (u.role === undefined) set.role = 'listener';
    if (u.artistId === undefined) set.artistId = null;
    if (u.planExpiresAt === undefined) set.planExpiresAt = VIP_PLAN_IDS.includes(u.planId) ? expiresAt : null;
    userOps.push({ updateOne: { filter: { _id: u._id }, update: { $set: set } } });
  }
  await write('users', userOps);

  return summary;
};

module.exports = { migrate };

if (require.main === module) {
  dotenv.config();
  const connectDB = require('../config/db');
  const dryRun = process.argv.includes('--dry-run');
  (async () => {
    await connectDB();
    const summary = await migrate(mongoose.connection.db, { dryRun });
    console.log(dryRun ? 'Dry-run (chưa ghi). Số bản ghi sẽ được cập nhật:' : '✅ Đã cập nhật số bản ghi:', summary);
    await mongoose.disconnect();
  })().catch(async (err) => {
    console.error('❌ Migrate lỗi:', err);
    await mongoose.disconnect();
    process.exit(1);
  });
}
