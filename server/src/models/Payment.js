const mongoose = require('mongoose');

// Giao dịch thanh toán (giả lập – app chưa có cổng thanh toán thật):
// - vip: mua / gia hạn gói VIP
// - ai_insight: mua thêm 1 lượt AI Fan Insight ($3, giai đoạn 6 – không còn bán). usedAt = lúc lượt này được dùng.
//   Giai đoạn 6b: lượt chưa dùng được đổi thành 20 tin nhắn AI Assistant (credits = 20).
// - ai_messages: mua thêm 20 tin nhắn AI Assistant (75.000đ, giai đoạn 6b). Không hết hạn.
//   credits = số tin đã mua, creditsUsed = số tin đã dùng.
// - deposit / withdraw: nạp / rút tiền ví qua MoMo (giả lập).
// Tiền tệ: VNĐ (ví). Giao dịch cũ của giai đoạn 6 ghi USD (currency = 'USD').
// balanceAfter = số dư ví sau giao dịch.
const paymentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ['vip', 'ai_insight', 'ai_messages', 'deposit', 'withdraw'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'VND' },
    balanceAfter: { type: Number, default: null },
    description: { type: String, default: '' },
    artistId: { type: String, default: null },
    usedAt: { type: Date, default: null },
    insightId: { type: String, default: null },
    credits: { type: Number, default: 0 },
    creditsUsed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1, type: 1, usedAt: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
