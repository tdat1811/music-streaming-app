const mongoose = require('mongoose');

const ACTIVITY_TYPES = ['follow', 'unfollow', 'like', 'unlike', 'playlist_add'];

// Tương tác của người nghe với nghệ sĩ / bài hát kèm thời điểm, để thống kê theo khoảng thời gian:
// theo dõi / bỏ theo dõi nghệ sĩ, thích / bỏ thích bài hát, thêm bài vào playlist.
const activityEventSchema = new mongoose.Schema({
  type: { type: String, enum: ACTIVITY_TYPES, required: true },
  artistId: { type: String, required: true },
  songId: { type: String, default: null },
  userId: { type: String, default: null },
  demo: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

activityEventSchema.index({ artistId: 1, type: 1, createdAt: 1 });

module.exports = mongoose.model('ActivityEvent', activityEventSchema);
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
