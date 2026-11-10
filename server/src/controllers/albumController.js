const Album = require('../models/Album');
const Song = require('../models/Song');

// Lấy tất cả Album
exports.getAllAlbums = async (req, res) => {
  try {
    const albums = await Album.find();
    res.status(200).json({ success: true, count: albums.length, data: albums });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy danh sách Album thịnh hành (Trending Albums)
exports.getTrendingAlbums = async (req, res) => {
  try {
    const albums = await Album.find({ isTrending: true });
    res.status(200).json({ success: true, count: albums.length, data: albums });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy chi tiết Album và kèm toàn bộ bài hát trong Album đó
exports.getAlbumById = async (req, res) => {
  try {
    const album = await Album.findOne({ id: req.params.id });
    if (!album) return res.status(404).json({ success: false, message: 'Không tìm thấy Album.' });

    // Lấy chi tiết các bài hát thuộc album này
    const tracks = await Song.find({ id: { $in: album.songIds } });
    const sortedTracks = album.songIds.map((id) => tracks.find((t) => t.id === id)).filter(Boolean);

    res.status(200).json({
      success: true,
      data: {
        ...album.toObject(),
        tracks: sortedTracks,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy danh sách Album của một nghệ sĩ
exports.getAlbumsByArtist = async (req, res) => {
  try {
    const { artistName } = req.params;
    const albums = await Album.find({ artist: new RegExp(`^${artistName}$`, 'i') });
    res.status(200).json({ success: true, count: albums.length, data: albums });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
