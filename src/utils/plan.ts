// Quy tắc gói VIP ở app (cùng quy tắc với server/src/config/plans.js)

export const VIP_PLAN_IDS = ['premium'];
export const PLAN_DURATION_MONTHS = 1;

const toValidDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Cộng tháng theo lịch (31/01 + 1 tháng -> 28/02 hoặc 29/02)
export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date.getTime());
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
};

// Gói VIP còn hiệu lực: đúng gói VIP và chưa quá ngày hết hạn
export const isPlanActive = (planId: string | null | undefined, expiresAt: unknown, now: Date = new Date()): boolean => {
  if (!planId || !VIP_PLAN_IDS.includes(planId)) return false;
  const expires = toValidDate(expiresAt);
  return !!expires && expires.getTime() > now.getTime();
};

// Ngày hết hạn mới khi thanh toán: còn hạn thì cộng dồn, hết hạn / chưa có thì tính từ hôm nay
export const nextExpiryDate = (currentExpiresAt: unknown, now: Date = new Date()): Date => {
  const current = toValidDate(currentExpiresAt);
  const base = current && current.getTime() > now.getTime() ? current : now;
  return addMonths(base, PLAN_DURATION_MONTHS);
};

// Hiển thị ngày dạng dd/mm/yyyy (không đọc được -> chuỗi rỗng)
export const formatDate = (value: unknown): string => {
  const date = toValidDate(value);
  if (!date) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
};

// Số ngày còn lại (làm tròn lên); hết hạn hoặc không có hạn -> 0
export const daysLeft = (expiresAt: unknown, now: Date = new Date()): number => {
  const expires = toValidDate(expiresAt);
  if (!expires) return 0;
  return Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
};
