const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const { requireAuth, requireSelf } = require('../middleware/auth');

// Chỉ xem được playlist của chính mình; tạo/sửa/xoá cần token
router.get('/user/:userId', requireAuth, requireSelf, playlistController.getUserPlaylists);
// Playlist là dữ liệu riêng: phải đăng nhập và là chủ playlist – BUG03
router.get('/:id', requireAuth, playlistController.getPlaylistById);
router.post('/create', requireAuth, playlistController.createPlaylist);
router.post('/add-song', requireAuth, playlistController.addSongToPlaylist);
router.post('/remove-song', requireAuth, playlistController.removeSongFromPlaylist);
router.put('/:id', requireAuth, playlistController.renamePlaylist);
router.delete('/:id', requireAuth, playlistController.deletePlaylist);

module.exports = router;
