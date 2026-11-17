const mongoose = require('mongoose');

// Báo cáo vi phạm do người nghe gửi. Mỗi người chỉ báo cáo 1 lần cho một nội dung.
const reportSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    targetType: { type: String, enum: ['song', 'post', 'comment'], required: true },
    targetId: { type: String, required: true },
    reporterId: { type: String, required: true },
    // Tác giả nội dung lúc báo cáo (để admin xem số vi phạm của họ)
    authorUserId: { type: String, default: null },
    snapshot: { type: String, default: '' },
    reason: { type: String, required: true },
    details: { type: String, default: '' },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    // removed = nội dung bị gỡ; dismissed = admin bỏ qua (không vi phạm)
    outcome: { type: String, enum: ['removed', 'dismissed', null], default: null },
    resolvedBy: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

reportSchema.index({ targetType: 1, targetId: 1, reporterId: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
