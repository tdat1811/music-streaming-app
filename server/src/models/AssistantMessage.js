const mongoose = require('mongoose');

// Tin nhắn trong cuộc trò chuyện AI Assistant (giai đoạn 6b). Tự xoá sau 30 ngày (TTL).
const assistantMessageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    chatId: { type: String, required: true },
    artistId: { type: String, required: true },
    userId: { type: String, required: true },
    role: { type: String, enum: ['user', 'ai'], required: true },
    // text | insight (thẻ phân tích fan) | captions (có nút Copy / Post to Feed)
    kind: { type: String, enum: ['text', 'insight', 'captions'], default: 'text' },
    text: { type: String, default: '' },
    captions: { type: [String], default: [] },
    suggestions: { type: [String], default: [] },
    insightId: { type: String, default: null },
    // Model đã trả lời; fallback = Auto đã chuyển sang model dự phòng
    model: { type: String, default: '' },
    fallback: { type: Boolean, default: false },
    // Tin của nghệ sĩ chưa được trả lời (AI lỗi / hết lượt) – có thể gửi lại
    failed: { type: Boolean, default: false },
    // Tin AI đã tính vào lượt; paid = dùng tin đã mua
    counted: { type: Boolean, default: false },
    paid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

assistantMessageSchema.index({ chatId: 1, createdAt: 1 });
assistantMessageSchema.index({ userId: 1, counted: 1, paid: 1, createdAt: 1 });
assistantMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('AssistantMessage', assistantMessageSchema);
