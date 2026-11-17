const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

// Người nghe báo cáo bài hát / bài đăng / bình luận vi phạm
router.post('/', requireAuth, reportController.createReport);

module.exports = router;
