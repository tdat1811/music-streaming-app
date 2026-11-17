// Chặn tài khoản bị khoá (giai đoạn 5): mọi yêu cầu kèm token của tài khoản đang bị khoá đều bị từ chối,
// kể cả API công khai. App nhận mã ACCOUNT_LOCKED thì đăng xuất và hiện lý do ở màn đăng nhập.
const { readUserId } = require('./auth');
const { ruleLabel } = require('../config/moderation');

const lockedMessage = (user) =>
  user.lockType === 'permanent'
    ? 'This account has been permanently locked. It reached 4 community standards violations.'
    : `This account has been locked. Reason: ${ruleLabel(user.lockReason)}.`;

const lockedResponse = (user) => ({
  success: false,
  code: 'ACCOUNT_LOCKED',
  message: lockedMessage(user),
  lockType: user.lockType,
  reason: user.lockReason,
});

const lockGuard = async (req, res, next) => {
  const userId = readUserId(req);
  if (!userId) return next();
  try {
    const User = require('../models/User');
    const user = await User.findOne({ id: userId }).select('lockedAt lockType lockReason').lean();
    if (user?.lockedAt) return res.status(403).json(lockedResponse(user));
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { lockGuard, lockedResponse };
