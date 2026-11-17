const express = require('express');
const router = express.Router();
const controller = require('../controllers/artistRequestController');
const { requireAuth } = require('../middleware/auth');
const { uploadAvatarFile } = require('../middleware/upload');

// Người nghe đăng ký làm nghệ sĩ: mọi API cần đăng nhập
router.use(requireAuth);

router.post('/', controller.createRequest);
router.get('/me', controller.getMyRequest);
router.delete('/me', controller.cancelMyRequest);
router.post('/avatar', uploadAvatarFile, controller.uploadAvatar);

module.exports = router;
