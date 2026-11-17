// Kiểm duyệt nội dung (giai đoạn 5): nhãn quy định, lý do báo cáo, nhật ký thao tác (cùng quy tắc với server/src/config/moderation.js)

export const MAX_VIOLATIONS = 3;

export const RULE_LABELS: Record<string, string> = {
  spam: 'Spam or misleading',
  harassment: 'Harassment or hate speech',
  offensive: 'Offensive or harmful content',
  copyright: 'Copyright infringement',
  scam: 'Scam or fraud',
  other: 'Other',
};
export const ruleLabel = (key?: string | null) => RULE_LABELS[key || ''] || RULE_LABELS.other;

// Admin chọn khi gỡ nội dung / khoá / ẩn trang
export const ADMIN_RULES = ['spam', 'harassment', 'offensive', 'copyright', 'scam', 'other'];
// Người nghe chọn khi báo cáo
export const REPORT_REASONS = ['spam', 'harassment', 'offensive', 'copyright', 'other'];

export type TargetType = 'song' | 'post' | 'comment';
export const TARGET_LABELS: Record<TargetType, string> = { song: 'Song', post: 'Post', comment: 'Comment' };
export const targetLabel = (t: string) => TARGET_LABELS[t as TargetType] || 'Content';

// Nhãn + màu cho một dòng nhật ký thao tác quản trị trên Dashboard
type Tone = 'pending' | 'ok' | 'bad' | 'grey' | 'artist' | 'admin' | 'lock';
export const ACTION_UI: Record<string, { label: string; tone: Tone }> = {
  remove_content: { label: 'Removed', tone: 'bad' },
  revoke_violation: { label: 'Restored', tone: 'ok' },
  dismiss_reports: { label: 'Dismissed', tone: 'grey' },
  lock: { label: 'Locked', tone: 'lock' },
  auto_lock: { label: 'Locked', tone: 'lock' },
  unlock: { label: 'Unlocked', tone: 'ok' },
  auto_unlock: { label: 'Unlocked', tone: 'ok' },
  change_role: { label: 'Role', tone: 'admin' },
  verify: { label: 'Verified', tone: 'artist' },
  unverify: { label: 'Unverified', tone: 'grey' },
  hide_page: { label: 'Hidden', tone: 'bad' },
  unhide_page: { label: 'Visible', tone: 'ok' },
};
export const actionUi = (action: string) => ACTION_UI[action] || { label: action, tone: 'grey' as Tone };

// Dòng phụ của một hành động: "by Admin Team · Spam" / "Automatically · 4 violations"
export const actionSubtitle = (a: { action: string; adminName?: string; ruleLabel?: string; note?: string }) => {
  const who = a.action.startsWith('auto_') ? 'Automatically' : a.adminName ? `by ${a.adminName}` : '';
  const why = a.action === 'change_role' || a.action.startsWith('auto_') ? a.note : a.ruleLabel;
  return [who, why].filter(Boolean).join(' · ');
};

// Tiêu đề của một dòng nhật ký: tên đối tượng, thêm loại nội dung nếu là nội dung
export const actionTitle = (a: { targetType: string; targetLabel?: string }) => {
  const label = a.targetLabel || '';
  if (a.targetType === 'comment') return `Comment "${label}"`;
  if (a.targetType === 'post') return `Post "${label}"`;
  if (a.targetType === 'song') return `Song "${label}"`;
  return label;
};

// Thông báo cho chủ nội dung bị gỡ (màn L4)
export const removalNoticeLines = (n: { targetType?: string; rule?: string; violationCount?: number }) => {
  const what = n.targetType === 'song' ? 'song' : n.targetType === 'post' ? 'post' : 'comment';
  const count = n.violationCount || 0;
  const title = `Your ${what} was removed`;
  const body = `because it violates our community standards (${ruleLabel(n.rule)}).`;
  const warning =
    count > MAX_VIOLATIONS
      ? 'Your account has been locked permanently.'
      : count === MAX_VIOLATIONS
        ? `Violation ${count} of ${MAX_VIOLATIONS}. One more and your account will be locked permanently.`
        : `Violation ${count} of ${MAX_VIOLATIONS}.`;
  return { title, body, warning, severe: count >= MAX_VIOLATIONS };
};
