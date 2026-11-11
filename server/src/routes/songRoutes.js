const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');

router.get('/', songController.getAllSongs);
router.get('/suggestions', songController.getSuggestions);
router.get('/search', songController.search);
router.get('/:id/stream', songController.streamSong);
router.get('/:id', songController.getSongById);
router.post('/by-ids', songController.getSongsByIds);

module.exports = router;
