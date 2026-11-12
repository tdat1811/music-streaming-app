const Notification = require('../models/Notification');

// Mọi API ở đây cần đăng nhập; người nhận lấy từ token (req.userId).

const MAX_NOTIFICATIONS = 50;

// Danh sách thông báo mới nhất của tôi + số chưa đọc
exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(MAX_NOTIFICATIONS),
      Notification.countDocuments({ userId, read: false }),
    ]);
    res.status(200).json({ success: true, unreadCount, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Đánh dấu một thông báo là đã đọc (chỉ thông báo của chính mình)
exports.markRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { id: req.params.id, userId: req.userId },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo.' });
    }
    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Đánh dấu tất cả là đã đọc
exports.markAllRead = async (req, res) => {
  try {
    const result = await Notification.updateMany({ userId: req.userId, read: false }, { read: true });
    res.status(200).json({ success: true, updated: result.modifiedCount ?? 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
