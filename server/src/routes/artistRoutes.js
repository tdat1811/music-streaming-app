const express = require('express');
const router = express.Router();
const artistController = require('../controllers/artistController');

router.get('/', artistController.getAllArtists);
router.get('/popular', artistController.getPopularArtists);
router.get('/:id', artistController.getArtistById);

module.exports = router;
