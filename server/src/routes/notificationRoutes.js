const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

// Thông báo là dữ liệu riêng của từng tài khoản nên luôn cần token
router.get('/', requireAuth, notificationController.getMyNotifications);
router.post('/read-all', requireAuth, notificationController.markAllRead);
router.post('/:id/read', requireAuth, notificationController.markRead);

module.exports = router;
