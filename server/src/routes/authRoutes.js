const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile/:userId', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.put('/change-password', authController.changePassword);
router.post('/subscribe', authController.subscribe);
router.post('/like-song', authController.toggleLikeSong);
router.post('/follow-artist', authController.toggleFollowArtist);
router.post('/like-album', authController.toggleLikeAlbum);
router.post('/download-song', authController.downloadSong);

module.exports = router;
