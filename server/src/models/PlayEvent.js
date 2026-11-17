const mongoose = require('mongoose');

// Một lượt nghe hợp lệ (đã qua luật chống tăng ảo), dùng cho thống kê theo thời gian của nghệ sĩ.
// Song.plays vẫn là tổng cộng dồn; bảng này cho biết lượt nghe xảy ra khi nào, từ ai, từ đâu.
const playEventSchema = new mongoose.Schema({
  songId: { type: String, required: true },
  artistId: { type: String, default: null },
  // Người nghe: "u:<userId>" khi đã đăng nhập, "ip:<mã băm>" với khách (không lưu IP thật)
  listenerKey: { type: String, required: true },
  // Nơi bấm phát: search | home | artist | album | playlist | feed | library | other
  source: { type: String, default: 'other' },
  // Dữ liệu giả lập do lệnh seed tạo ra (để biểu đồ có số liệu khi demo)
  demo: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

playEventSchema.index({ artistId: 1, createdAt: 1 });
playEventSchema.index({ songId: 1, listenerKey: 1, createdAt: -1 });

module.exports = mongoose.model('PlayEvent', playEventSchema);
