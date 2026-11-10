const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');

router.get('/user/:userId', playlistController.getUserPlaylists);
router.get('/:id', playlistController.getPlaylistById);
router.post('/create', playlistController.createPlaylist);
router.post('/add-song', playlistController.addSongToPlaylist);
router.post('/remove-song', playlistController.removeSongFromPlaylist);
router.delete('/:id', playlistController.deletePlaylist);

module.exports = router;
