const mongoose = require('mongoose');

// Một cuộc trò chuyện với AI Assistant (giai đoạn 6b). Tự xoá 30 ngày sau tin nhắn cuối (TTL).
const assistantChatSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    artistId: { type: String, required: true },
    userId: { type: String, required: true },
    title: { type: String, default: 'New chat' },
    // Tên do nghệ sĩ tự đặt thì không tự đổi theo câu hỏi đầu nữa
    titleEdited: { type: Boolean, default: false },
    // 'auto' | tên model Gemini (VD gemini-3.8-flash)
    model: { type: String, default: 'auto' },
    messageCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

assistantChatSchema.index({ userId: 1, lastMessageAt: -1 });
assistantChatSchema.index({ lastMessageAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('AssistantChat', assistantChatSchema);
