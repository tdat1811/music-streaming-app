const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth, requireSelf } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
// Chỉ xem được hồ sơ của chính mình (hồ sơ có email, số điện thoại) – BUG02
router.get('/profile/:userId', requireAuth, requireSelf, authController.getProfile);
// Các route dưới đây cần token đăng nhập
router.put('/profile', requireAuth, authController.updateProfile);
router.put('/change-password', requireAuth, authController.changePassword);
router.post('/subscribe', requireAuth, authController.subscribe);
router.post('/like-song', requireAuth, authController.toggleLikeSong);
router.post('/follow-artist', requireAuth, authController.toggleFollowArtist);
router.post('/like-album', requireAuth, authController.toggleLikeAlbum);
router.post('/download-song', requireAuth, authController.downloadSong);
// Thêm 2 dòng này trước dòng module.exports = router;
router.post('/deposit-momo', requireAuth, authController.depositMoMo);
router.post('/withdraw-momo', requireAuth, authController.withdrawMoMo);

module.exports = router;
