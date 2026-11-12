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

const SONGS = [
  { id: 's1', title: 'Blinding Lights', artist: 'The Weeknd', plays: '12.8M', category: 'suggestions' },
  { id: 's2', title: 'Starboy', artist: 'The Weeknd ft. Daft Punk', plays: '8.5M' },
  { id: 's3', title: 'Save Your Tears', artist: 'The Weeknd', plays: '10.7M' },
  { id: 's4', title: 'Lạc Trôi', artist: 'Sơn Tùng M-TP', plays: '18.2M' },
  { id: 's5', title: 'Nơi Này Có Anh', artist: 'Sơn Tùng M-TP', plays: '15.8M' },
  { id: 's6', title: 'In The Stars', artist: 'Benson Boone', plays: '3.4M', category: 'suggestions' },
  // Thêm bài để kiểm tra giới hạn 15 gợi ý khi từ khoá rỗng (tổng 20 bài)
  ...Array.from({ length: 14 }, (_, i) => ({ id: `s${i + 7}`, title: `Bài mẫu ${i + 7}`, artist: 'Nghệ sĩ mẫu', plays: '1K' })),
];

async function seedTestData() {
  hashCache = hashCache || (await bcrypt.hash(MAT_KHAU, 10));
  await User.create([
    { id: 'u_ashley', name: 'Ashley Scott', email: 'ashley@example.com', password: hashCache, planId: null },
    { id: 'u_jason', name: 'Jason Smith', email: 'jason@example.com', password: hashCache, planId: 'premium' },
  ]);
  await Song.create(SONGS.map((s) => ({ duration: '03:30', ...s })));
  await Artist.create([
    { id: 'a_weeknd', name: 'The Weeknd' },
    { id: 'a_sontung', name: 'Sơn Tùng M-TP' },
  ]);
  await Playlist.create({ id: 'p_jason', ownerId: 'u_jason', title: 'Jason Mix', songIds: ['s1'] });
  await FeedPost.create({ id: 'fp1', authorName: 'Soundwave', songId: 's1', likes: 20, likedByUserIds: [], shares: 5 });
  await Comment.create([
    { id: 'c_jason', postId: 'fp1', userId: 'u_jason', userName: 'Jason Smith', text: 'Bài này hay quá', replies: [] },
    { id: 'c_ashley', postId: 'fp1', userId: 'u_ashley', userName: 'Ashley Scott', text: 'Nghe cả ngày không chán', replies: [] },
  ]);
}

module.exports = { seedTestData, MAT_KHAU, SONGS };
