// Luật kiểm duyệt dạng hàm thuần (không đụng CSDL) để kiểm thử đơn vị
const { RULES, REPORT_REASONS, TARGET_TYPES, LOCK_AT, REPORT_LIMITS, NOTE_MAX } = require('../config/moderation');

const clean = (v) => (typeof v === 'string' ? v.trim() : '');

// Admin chọn quy định bị vi phạm (+ ghi chú tuỳ chọn)
const validateRuleInput = (body = {}) => {
  const errors = {};
  const rule = clean(body.rule);
  const note = clean(body.note);
  if (!rule) errors.rule = 'Please choose a rule.';
  else if (!RULES[rule]) errors.rule = 'Unknown rule.';
  if (note.length > NOTE_MAX) errors.note = `Note must be at most ${NOTE_MAX} characters.`;
  return { errors, value: { rule, note } };
};

// Người nghe gửi báo cáo
const validateReportInput = (body = {}) => {
  const errors = {};
  const targetType = clean(body.targetType);
  const targetId = clean(body.targetId);
  const reason = clean(body.reason);
  const details = clean(body.details);
  if (!TARGET_TYPES.includes(targetType) || !targetId) errors.target = 'Nothing to report.';
  if (!reason) errors.reason = 'Please choose a reason.';
  else if (!REPORT_REASONS.includes(reason)) errors.reason = 'Unknown reason.';
  if (details.length > REPORT_LIMITS.detailsMax) errors.details = `Details must be at most ${REPORT_LIMITS.detailsMax} characters.`;
  return { errors, value: { targetType, targetId, reason, details } };
};

// Số vi phạm còn hiệu lực đã tới ngưỡng khoá vĩnh viễn chưa
const reachesPermanentLock = (activeViolations) => activeViolations >= LOCK_AT;

// Lần gỡ tiếp theo có làm tài khoản bị khoá vĩnh viễn không (để cảnh báo admin trước)
const nextRemovalLocks = (activeViolations, lockType) => lockType !== 'permanent' && reachesPermanentLock(activeViolations + 1);

// Sau khi huỷ (revoke) một vi phạm: tài khoản đang khoá vĩnh viễn và còn dưới ngưỡng thì mở lại.
// Khoá tay không tự mở.
const unlockAfterRevoke = (activeViolations, lockType) => lockType === 'permanent' && !reachesPermanentLock(activeViolations);

// Đổi vai trò: chỉ Listener ↔ Admin, không tự đổi, không đổi tài khoản nghệ sĩ,
// không đưa tài khoản đang khoá lên admin, không hạ admin cuối cùng. null = được phép.
const roleChangeError = ({ actorId, target, newRole, adminCount }) => {
  if (!['listener', 'admin'].includes(newRole)) return 'Role can only be Listener or Admin. Artists are added by approving a request.';
  if (target.id === actorId) return "You can't change your own role.";
  if (target.role === 'artist') return "Artist accounts can't change role.";
  if (target.role === newRole) return `This account is already ${newRole === 'admin' ? 'an admin' : 'a listener'}.`;
  if (newRole === 'admin' && target.lockedAt) return "Locked accounts can't become admins.";
  if (target.role === 'admin' && newRole === 'listener' && adminCount <= 1) return "You can't remove the last admin.";
  return null;
};

// Khoá tay: không khoá chính mình, không khoá admin (hạ quyền trước), không khoá đè khoá vĩnh viễn
const lockError = ({ actorId, target }) => {
  if (target.id === actorId) return "You can't lock your own account.";
  if (target.role === 'admin') return 'Change this admin to Listener before locking the account.';
  if (target.lockType === 'permanent') return 'This account is already permanently locked.';
  if (target.lockedAt) return 'This account is already locked.';
  return null;
};

// Mở khoá: chỉ mở được khoá tay
const unlockError = (target) => {
  if (!target.lockedAt) return 'This account is not locked.';
  if (target.lockType === 'permanent') return "Permanent locks can't be undone. Revoke a violation that was a mistake instead.";
  return null;
};

module.exports = {
  validateRuleInput,
  validateReportInput,
  reachesPermanentLock,
  nextRemovalLocks,
  unlockAfterRevoke,
  roleChangeError,
  lockError,
  unlockError,
};
