const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');

router.get('/', albumController.getAllAlbums);
router.get('/trending', albumController.getTrendingAlbums);
router.get('/:id', albumController.getAlbumById);
router.get('/artist/:artistName', albumController.getAlbumsByArtist);

module.exports = router;
