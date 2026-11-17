const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Payment = require('../models/Payment');
const User = require('../models/User');

// Khoản chi (trừ tiền ví); deposit / withdraw là nạp / rút, không tính vào "đã chi"
const SPEND_TYPES = ['vip', 'ai_messages', 'ai_insight'];

// Ví & lịch sử thanh toán của chính tài khoản đang đăng nhập:
// số dư ví (VNĐ), gói VIP, gói 20 tin AI Assistant (kèm số tin đã dùng), nạp / rút MoMo,
// và các lượt AI Fan Insight cũ của giai đoạn 6 (ghi USD).
router.get('/', requireAuth, async (req, res) => {
  try {
    const [payments, user] = await Promise.all([
      Payment.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100).lean(),
      User.findOne({ id: req.userId }).select('balance').lean(),
    ]);
    // Tổng đã chi theo từng loại tiền (VNĐ là chính; USD chỉ còn ở giao dịch cũ)
    const totals = {};
    payments
      .filter((p) => SPEND_TYPES.includes(p.type))
      .forEach((p) => {
        const cur = p.currency || 'VND';
        totals[cur] = Math.round(((totals[cur] || 0) + (p.amount || 0)) * 100) / 100;
      });
    res.status(200).json({
      success: true,
      balance: user?.balance || 0,
      total: totals.VND || 0,
      totals,
      data: payments.map((p) => ({
        id: p.id,
        type: p.type,
        amount: p.amount,
        currency: p.currency || 'VND',
        // +1 = tiền vào ví (nạp), -1 = tiền ra (mua, rút)
        direction: p.type === 'deposit' ? 1 : -1,
        description: p.description,
        createdAt: p.createdAt,
        balanceAfter: p.balanceAfter ?? null,
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
