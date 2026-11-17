const express = require('express');
const router = express.Router();
const studio = require('../controllers/studioController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { uploadSongFiles, uploadStudioImage } = require('../middleware/upload');

// Mọi API trong Artist Studio: phải đăng nhập và có vai trò nghệ sĩ.
// Trong controller còn kiểm tra nghệ sĩ là chủ của bài hát / album / trang nghệ sĩ.
router.use(requireAuth, requireRole('artist'));

router.get('/overview', studio.getOverview);
router.post('/images', uploadStudioImage, studio.uploadImage);

router.get('/stats', studio.getStats);
router.get('/insights', studio.getInsight);
router.get('/insights/:id', studio.getInsightById);

// AI Assistant (giai đoạn 6b): chat hỏi đáp + phân tích fan, 20 tin miễn phí / ngày
router.get('/assistant/chats', studio.assistantChats);
router.get('/assistant/models', studio.assistantModels);
router.get('/assistant/chats/:id', studio.assistantChat);
router.patch('/assistant/chats/:id', studio.assistantUpdateChat);
router.delete('/assistant/chats/:id', studio.assistantDeleteChat);
router.post('/assistant/chats/:id/retry', studio.assistantRetry);
router.post('/assistant/chats/:id/basic-summary', studio.assistantBasicSummary);
router.post('/assistant/messages', studio.assistantSend);
router.post('/assistant/purchase', studio.assistantPurchase);
router.get('/stats/songs/:id', studio.getSongStats);

router.get('/songs', studio.getMySongs);
router.post('/songs', uploadSongFiles, studio.uploadSong);
router.get('/songs/:id', studio.getMySong);
router.put('/songs/:id', studio.updateSong);
router.patch('/songs/:id/status', studio.setSongStatus);
router.delete('/songs/:id', studio.deleteSong);

router.get('/albums', studio.getMyAlbums);
router.post('/albums', studio.createAlbum);
router.get('/albums/:id', studio.getMyAlbum);
router.put('/albums/:id', studio.updateAlbum);
router.delete('/albums/:id', studio.deleteAlbum);

router.get('/profile', studio.getProfile);
router.put('/profile', studio.updateProfile);

module.exports = router;
