// Dữ liệu mẫu nhỏ, cố định cho kiểm thử tích hợp (độc lập với src/seed/seedData.js).
const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');
const Song = require('../../src/models/Song');
const Artist = require('../../src/models/Artist');
const Playlist = require('../../src/models/Playlist');
const FeedPost = require('../../src/models/FeedPost');
const Comment = require('../../src/models/Comment');

const MAT_KHAU = '123456';
let hashCache;

const NGAY_MS = 24 * 60 * 60 * 1000;

const SONGS = [
  { id: 's1', title: 'Blinding Lights', artist: 'The Weeknd', artistId: 'a_weeknd', plays: 12800000, category: 'suggestions' },
  { id: 's2', title: 'Starboy', artist: 'The Weeknd ft. Daft Punk', artistId: 'a_weeknd', plays: 8500000 },
  { id: 's3', title: 'Save Your Tears', artist: 'The Weeknd', artistId: 'a_weeknd', plays: 10700000 },
  { id: 's4', title: 'Lạc Trôi', artist: 'Sơn Tùng M-TP', artistId: 'a_sontung', plays: 18200000 },
  { id: 's5', title: 'Nơi Này Có Anh', artist: 'Sơn Tùng M-TP', artistId: 'a_sontung', plays: 15800000 },
  { id: 's6', title: 'In The Stars', artist: 'Benson Boone', plays: 3400000, category: 'suggestions' },
  // Thêm bài để kiểm tra giới hạn 15 gợi ý khi từ khoá rỗng (tổng 20 bài công khai)
  ...Array.from({ length: 14 }, (_, i) => ({ id: `s${i + 7}`, title: `Bài mẫu ${i + 7}`, artist: 'Nghệ sĩ mẫu', plays: 1000 })),
];

// Bài nháp của nghệ sĩ Mer: không được hiện ở các API công khai
const DRAFT_SONG = { id: 's_draft', title: 'Bản nháp chưa phát hành', artist: 'Mer Watson', artistId: 'a_mer', plays: 0, status: 'draft' };

async function seedTestData() {
  hashCache = hashCache || (await bcrypt.hash(MAT_KHAU, 10));
  const now = Date.now();
  await User.create([
    { id: 'u_ashley', name: 'Ashley Scott', email: 'ashley@example.com', password: hashCache, planId: null },
    // VIP còn hạn 30 ngày
    { id: 'u_jason', name: 'Jason Smith', email: 'jason@example.com', password: hashCache, planId: 'premium', planExpiresAt: new Date(now + 30 * NGAY_MS) },
    // VIP đã hết hạn hôm qua
    { id: 'u_kevin', name: 'Kevin Brown', email: 'kevin@example.com', password: hashCache, planId: 'premium', planExpiresAt: new Date(now - NGAY_MS) },
    // Tài khoản nghệ sĩ, sở hữu trang a_mer
    { id: 'u_mer', name: 'Mer Watson', email: 'mer@example.com', password: hashCache, planId: null, role: 'artist', artistId: 'a_mer' },
    // Có role artist nhưng chưa được gắn trang nghệ sĩ
    { id: 'u_lan', name: 'Lan Nguyen', email: 'lan@example.com', password: hashCache, planId: null, role: 'artist', artistId: null },
    // Quản trị viên (duyệt đăng ký nghệ sĩ)
    { id: 'u_admin', name: 'Admin Team', email: 'admin@example.com', password: hashCache, planId: null, role: 'admin' },
  ]);
  await Song.create([...SONGS, DRAFT_SONG].map((s) => ({ duration: '03:30', ...s })));
  await Artist.create([
    { id: 'a_weeknd', name: 'The Weeknd', followersCount: 100, avatarImage: 'https://example.com/weeknd.jpg' },
    { id: 'a_sontung', name: 'Sơn Tùng M-TP', followersCount: 0 },
    { id: 'a_mer', name: 'Mer Watson', followersCount: 5, ownerUserId: 'u_mer' },
  ]);
  await Playlist.create({ id: 'p_jason', ownerId: 'u_jason', title: 'Jason Mix', songIds: ['s1'] });
  await FeedPost.create([
    // Bài cũ chưa có tác giả là nghệ sĩ: giữ tên đã lưu
    { id: 'fp1', authorName: 'Soundwave', songId: 's1', likes: 20, likedByUserIds: [], shares: 5 },
    // Bài của nghệ sĩ: tên / ảnh lưu sẵn đã cũ, API phải lấy theo Artist
    { id: 'fp2', authorArtistId: 'a_weeknd', authorName: 'Tên cũ', authorAvatar: '', songId: 's3', content: 'Cảm ơn mọi người!' },
  ]);
  await Comment.create([
    { id: 'c_jason', postId: 'fp1', userId: 'u_jason', userName: 'Jason Smith', text: 'Bài này hay quá', replies: [] },
    { id: 'c_ashley', postId: 'fp1', userId: 'u_ashley', userName: 'Ashley Scott', text: 'Nghe cả ngày không chán', replies: [] },
  ]);
}

module.exports = { seedTestData, MAT_KHAU, SONGS };
