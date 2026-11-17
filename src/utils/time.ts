// Hiển thị thời gian tương đối: "Just now", "5m", "3h", "2d"
export const timeAgo = (iso: string | null | undefined, now: number = Date.now()): string => {
  if (!iso) return '';
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (!Number.isFinite(seconds) || seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

// "16/11/2026 · 10:24"
export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// Câu hiển thị kèm "ago": "5m ago", "2d ago"; dưới 1 phút -> "just now" (tránh "Just now ago")
export const timeAgoText = (iso: string | null | undefined, now: number = Date.now()): string => {
  const t = timeAgo(iso, now);
  if (!t) return '';
  return t === 'Just now' ? 'just now' : `${t} ago`;
};
