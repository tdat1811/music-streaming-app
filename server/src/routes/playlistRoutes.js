const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const { requireAuth, requireSelf } = require('../middleware/auth');

// Chỉ xem được playlist của chính mình; tạo/sửa/xoá cần token
router.get('/user/:userId', requireAuth, requireSelf, playlistController.getUserPlaylists);
router.get('/:id', playlistController.getPlaylistById);
router.post('/create', requireAuth, playlistController.createPlaylist);
router.post('/add-song', requireAuth, playlistController.addSongToPlaylist);
router.post('/remove-song', requireAuth, playlistController.removeSongFromPlaylist);
router.delete('/:id', requireAuth, playlistController.deletePlaylist);

module.exports = router;
