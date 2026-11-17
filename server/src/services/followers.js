const User = require('../models/User');
const Song = require('../models/Song');
const Notification = require('../models/Notification');
const { makeId } = require('../utils/ids');

// Gửi thông báo cho mọi người đang theo dõi nghệ sĩ (ghi một lần nhiều bản ghi).
// Lỗi ở đây không làm hỏng việc đăng bài / đăng bài hát.
const notifyFollowers = async (artist, { type, postId = '', songId = '', text = '' }) => {
  try {
    const followers = await User.find({ followedArtistIds: artist.id, id: { $ne: artist.ownerUserId } }).select('id').lean();
    if (!followers.length) return 0;
    await Notification.insertMany(
      followers.map((u) => ({
        id: makeId('n'),
        userId: u.id,
        type,
        actorId: artist.ownerUserId || '',
        actorName: artist.name,
        artistId: artist.id,
        postId,
        songId,
        text,
      })),
      { ordered: false }
    );
    return followers.length;
  } catch (err) {
    console.error('Không gửi được thông báo cho người theo dõi:', err.message);
    return 0;
  }
};

// Báo "bài hát mới" – chỉ một lần cho mỗi bài (lần đầu bài được đăng công khai)
const notifyNewSongOnce = async (artist, song) => {
  if (!song || (song.status || 'published') !== 'published') return 0;
  // Đánh dấu có điều kiện để hai yêu cầu cùng lúc không gửi trùng
  const claimed = await Song.findOneAndUpdate(
    { id: song.id, followersNotifiedAt: null },
    { followersNotifiedAt: new Date() },
    { new: true }
  );
  if (!claimed) return 0;
  return notifyFollowers(artist, { type: 'artist_new_song', songId: song.id, text: song.title });
};

module.exports = { notifyFollowers, notifyNewSongOnce };
