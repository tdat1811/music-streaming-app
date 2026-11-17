const mongoose = require('mongoose');

// Trạng thái bài hát: draft (nháp, chỉ nghệ sĩ thấy) | published (công khai) | hidden (bị ẩn)
const SONG_STATUSES = ['draft', 'published', 'hidden'];

const songSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    // Tên nghệ sĩ hiển thị (giữ để tương thích); liên kết thật dùng artistId
    artist: { type: String, required: true },
    artistId: { type: String, default: null },
    // Lượt nghe dạng số, tăng 1 mỗi lần nghe (POST /api/songs/:id/play)
    plays: { type: Number, default: 0, min: 0 },
    duration: { type: String, default: '03:30' },
    coverImage: { type: String, default: '' },
    audioUrl: { type: String, default: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    category: { type: String, default: 'general' }, // 'suggestions', 'charts', 'search', etc.
    status: { type: String, enum: SONG_STATUSES, default: 'published' },
    genre: { type: String, default: '' },
    description: { type: String, default: '' },
    lyrics: { type: String, default: '' },
    releaseAt: { type: Date, default: null },
    // Đã báo "bài hát mới" cho người theo dõi (chỉ báo một lần)
    followersNotifiedAt: { type: Date, default: null },
    // Giai đoạn 5: bị admin gỡ vì vi phạm (nghệ sĩ không tự hiện lại được)
    removedAt: { type: Date, default: null },
    removedRule: { type: String, default: '' },
    removedViolationId: { type: String, default: null },
    // Tạm ẩn vì trang nghệ sĩ bị ẩn hoặc chủ trang bị khoá (tự hiện lại khi được mở)
    suspendedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Tạo text index phục vụ tìm kiếm theo tên bài hát hoặc ca sĩ
songSchema.index({ title: 'text', artist: 'text' });
songSchema.index({ artistId: 1 });

// Điều kiện "bài hát công khai". Dữ liệu cũ chưa có status vẫn được coi là công khai.
// Bài bị admin gỡ hoặc đang tạm ẩn (trang nghệ sĩ bị ẩn / chủ trang bị khoá) không hiện với người nghe.
const PUBLIC_SONG_FILTER = { status: { $nin: ['draft', 'hidden'] }, removedAt: null, suspendedAt: null };

module.exports = mongoose.model('Song', songSchema);
module.exports.SONG_STATUSES = SONG_STATUSES;
module.exports.PUBLIC_SONG_FILTER = PUBLIC_SONG_FILTER;
