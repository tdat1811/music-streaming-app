const Artist = require('../models/Artist');
const Song = require('../models/Song');
const Album = require('../models/Album');

// Lấy tất cả nghệ sĩ
exports.getAllArtists = async (req, res) => {
  try {
    const artists = await Artist.find();
    res.status(200).json({ success: true, count: artists.length, data: artists });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy danh sách nghệ sĩ nổi bật (Popular artists)
exports.getPopularArtists = async (req, res) => {
  try {
    const artists = await Artist.find({ isPopular: true });
    res.status(200).json({ success: true, count: artists.length, data: artists });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy thông tin chi tiết nghệ sĩ: Bio, bài hát nổi bật, danh sách album
exports.getArtistById = async (req, res) => {
  try {
    const artist = await Artist.findOne({ id: req.params.id });
    if (!artist) return res.status(404).json({ success: false, message: 'Không tìm thấy nghệ sĩ.' });

    // Lấy các bài hát của nghệ sĩ
    const tracks = await Song.find({ artist: new RegExp(`^${artist.name}$`, 'i') });
    // Lấy các Album của nghệ sĩ
    const albums = await Album.find({ artist: new RegExp(`^${artist.name}$`, 'i') });
    // Lấy gợi ý nghệ sĩ tương tự (Fans also like)
    const relatedArtists = await Artist.find({ id: { $ne: artist.id } }).limit(4);

    res.status(200).json({
      success: true,
      data: {
        ...artist.toObject(),
        tracks,
        albums,
        relatedArtists,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
