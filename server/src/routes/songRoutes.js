const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');
const { optionalAuth } = require('../middleware/auth');

router.get('/', songController.getAllSongs);
router.get('/suggestions', songController.getSuggestions);
router.get('/search', songController.search);
router.get('/:id/stream', songController.streamSong);
// Có token thì biết người nghe là ai (đếm người nghe, bỏ lượt nghe của chính nghệ sĩ); khách vẫn gọi được
router.post('/:id/play', optionalAuth, songController.recordPlay);
router.get('/:id', songController.getSongById);
router.post('/by-ids', songController.getSongsByIds);

module.exports = router;
