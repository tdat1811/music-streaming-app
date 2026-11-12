// Các gói hội viên hợp lệ, khớp với SUBSCRIPTION_PLANS ở ứng dụng
const VALID_PLAN_IDS = ['free', 'premium'];

// Các gói được xem là VIP (gói "free" vẫn là thành viên thường)
const VIP_PLAN_IDS = ['premium'];

const isVipUser = (user) => !!user && VIP_PLAN_IDS.includes(user.planId);

const VIP_REQUIRED_MESSAGE = 'Tính năng này chỉ dành cho thành viên VIP. Vui lòng đăng ký Gói VIP (Premium).';

module.exports = { VALID_PLAN_IDS, VIP_PLAN_IDS, isVipUser, VIP_REQUIRED_MESSAGE };
