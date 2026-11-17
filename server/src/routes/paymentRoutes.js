const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Payment = require('../models/Payment');

// Lịch sử thanh toán của chính tài khoản đang đăng nhập (giai đoạn 6): gói VIP + lượt AI Fan Insight cũ
// + gói 20 tin nhắn AI Assistant (giai đoạn 6b, kèm số tin đã dùng)
router.get('/', requireAuth, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100).lean();
    const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
    res.status(200).json({
      success: true,
      total: Math.round(total * 100) / 100,
      data: payments.map((p) => ({
        id: p.id,
        type: p.type,
        amount: p.amount,
        currency: p.currency,
        description: p.description,
        createdAt: p.createdAt,
        // Gói tin nhắn (kể cả lượt Insight cũ đã đổi sang 20 tin): dùng hết = used
        credits: p.credits || 0,
        creditsUsed: p.creditsUsed || 0,
        used: p.credits > 0 ? (p.creditsUsed || 0) >= p.credits : p.type === 'ai_insight' ? !!p.usedAt : null,
        usedAt: p.usedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
