const mongoose = require('mongoose');

// Một lần phân tích AI Fan Insight của nghệ sĩ (giai đoạn 6)
const insightSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    artistId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    // gemini = do AI viết; basic = bản tóm tắt cơ bản (AI không dùng được) – không tính lượt
    source: { type: String, enum: ['gemini', 'basic'], required: true },
    // Dùng lượt đã mua ($3) thay vì lượt miễn phí
    paid: { type: Boolean, default: false },
    model: { type: String, default: '' },
    // Lý do dùng bản cơ bản: no_key | ai_error | quota | blocked | invalid_output
    fallbackReason: { type: String, default: '' },
    windowDays: { type: Number, default: 30 },
    commentCount: { type: Number, default: 0 },
    postCount: { type: Number, default: 0 },
    result: { type: mongoose.Schema.Types.Mixed, required: true },
    stats: { type: mongoose.Schema.Types.Mixed, default: null },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
  },
  { timestamps: true }
);

insightSchema.index({ artistId: 1, createdAt: -1 });

module.exports = mongoose.model('Insight', insightSchema);
