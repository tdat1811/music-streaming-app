// Người nghe báo cáo nội dung vi phạm (giai đoạn 5). Route POST /api/reports (requireAuth).
const User = require('../models/User');
const Report = require('../models/Report');
const { makeId } = require('../utils/ids');
const { REPORT_LIMITS } = require('../config/moderation');
const { validateReportInput } = require('../utils/moderationRules');
const { findTarget, snippet } = require('../services/moderation');

const DAY_MS = 24 * 60 * 60 * 1000;

exports.createReport = async (req, res) => {
  try {
    const { errors, value } = validateReportInput(req.body);
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, code: 'INVALID', message: Object.values(errors)[0], errors });
    }
    const target = await findTarget(value.targetType, value.targetId);
    if (!target || !target.visible) {
      return res.status(404).json({ success: false, message: 'This content is no longer available.' });
    }
    if (target.authorUserId === req.userId) {
      return res.status(400).json({ success: false, code: 'OWN_CONTENT', message: "You can't report your own content." });
    }
    const author = target.authorUserId ? await User.findOne({ id: target.authorUserId }).select('role').lean() : null;
    if (author?.role === 'admin') {
      return res.status(400).json({ success: false, code: 'NOT_REPORTABLE', message: "This content can't be reported." });
    }
    if (await Report.exists({ targetType: value.targetType, targetId: value.targetId, reporterId: req.userId })) {
      return res.status(409).json({ success: false, code: 'ALREADY_REPORTED', message: "You've already reported this. We'll review it." });
    }
    const today = await Report.countDocuments({ reporterId: req.userId, createdAt: { $gte: new Date(Date.now() - DAY_MS) } });
    if (today >= REPORT_LIMITS.perDay) {
      return res.status(429).json({ success: false, code: 'REPORT_LIMIT', message: `You can send at most ${REPORT_LIMITS.perDay} reports a day.` });
    }
    const report = await Report.create({
      id: makeId('rp'),
      targetType: value.targetType,
      targetId: value.targetId,
      reporterId: req.userId,
      authorUserId: target.authorUserId,
      snapshot: snippet(target.text, 300),
      reason: value.reason,
      details: value.details,
    });
    res.status(201).json({ success: true, message: "Thanks, we'll review it.", data: { id: report.id } });
  } catch (err) {
    // Gửi 2 lần cùng lúc: chỉ mục unique chặn bản thứ hai
    if (err.code === 11000) {
      return res.status(409).json({ success: false, code: 'ALREADY_REPORTED', message: "You've already reported this. We'll review it." });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};
