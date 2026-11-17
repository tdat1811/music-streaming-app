// Các gói hội viên hợp lệ, khớp với SUBSCRIPTION_PLANS ở ứng dụng
const VALID_PLAN_IDS = ['free', 'premium'];

// Các gói được xem là VIP (gói "free" vẫn là thành viên thường)
const VIP_PLAN_IDS = ['premium'];

// Mỗi lần thanh toán gói VIP có hiệu lực 1 tháng
const PLAN_DURATION_MONTHS = 1;

// Cộng thêm số tháng theo lịch (31/01 + 1 tháng -> 28/02 hoặc 29/02, không nhảy sang tháng 3)
const addMonths = (date, months) => {
  const result = new Date(date.getTime());
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
};

const toValidDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// VIP khi: đang ở gói VIP VÀ chưa quá ngày hết hạn
const isVipUser = (user, now = new Date()) => {
  if (!user || !VIP_PLAN_IDS.includes(user.planId)) return false;
  const expiresAt = toValidDate(user.planExpiresAt);
  return !!expiresAt && expiresAt.getTime() > now.getTime();
};

// Ngày hết hạn mới sau khi thanh toán gói VIP:
// - còn hạn: gia hạn tiếp từ ngày hết hạn cũ (không mất ngày đã trả tiền)
// - hết hạn / chưa có: tính 1 tháng từ lúc thanh toán
const nextExpiryDate = (currentExpiresAt, now = new Date()) => {
  const current = toValidDate(currentExpiresAt);
  const base = current && current.getTime() > now.getTime() ? current : now;
  return addMonths(base, PLAN_DURATION_MONTHS);
};

// Bảng giá từng gói cước (Đơn vị: VNĐ) – trừ vào số dư ví khi mua
const PLAN_PRICES = {
  free: 0,
  premium: 59000, // 59.000 VNĐ / tháng
};

const VIP_REQUIRED_MESSAGE = 'Tính năng này chỉ dành cho thành viên VIP. Vui lòng đăng ký Gói VIP (Premium).';

module.exports = {
  VALID_PLAN_IDS,
  VIP_PLAN_IDS,
  PLAN_DURATION_MONTHS,
  PLAN_PRICES,
  addMonths,
  isVipUser,
  nextExpiryDate,
  VIP_REQUIRED_MESSAGE,
};
