const Artist = require('../models/Artist');
const { escapeRegex } = require('../utils/ids');
const Song = require('../models/Song');
const { PUBLIC_SONG_FILTER } = Song;
const { withPublicSongs } = require('../services/publicAlbums');
const Album = require('../models/Album');
const { PUBLIC_ARTIST_FILTER } = Artist;

// Lấy tất cả nghệ sĩ
exports.getAllArtists = async (req, res) => {
  try {
    const artists = await Artist.find(PUBLIC_ARTIST_FILTER);
    res.status(200).json({ success: true, count: artists.length, data: artists });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy danh sách nghệ sĩ nổi bật (Popular artists)
exports.getPopularArtists = async (req, res) => {
  try {
    const artists = await Artist.find({ isPopular: true, ...PUBLIC_ARTIST_FILTER });
    res.status(200).json({ success: true, count: artists.length, data: artists });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy thông tin chi tiết nghệ sĩ: Bio, bài hát nổi bật, danh sách album
exports.getArtistById = async (req, res) => {
  try {
    const artist = await Artist.findOne({ id: req.params.id, ...PUBLIC_ARTIST_FILTER });
    if (!artist) return res.status(404).json({ success: false, message: 'Không tìm thấy nghệ sĩ.' });

    // Bài hát / album của nghệ sĩ: ưu tiên liên kết theo artistId; dữ liệu cũ chưa có artistId thì so theo tên
    const byArtist = {
      $or: [
        { artistId: artist.id },
        { artistId: { $in: [null, ''] }, artist: new RegExp(`^${escapeRegex(artist.name)}$`, 'i') },
      ],
    };
    const tracks = await Song.find({ $and: [byArtist, PUBLIC_SONG_FILTER] });
    const albums = await Album.find({ $and: [byArtist, { status: { $nin: ['draft', 'hidden'] } }] });
    // Lấy gợi ý nghệ sĩ tương tự (Fans also like)
    const relatedArtists = await Artist.find({ id: { $ne: artist.id }, ...PUBLIC_ARTIST_FILTER }).limit(4);

    res.status(200).json({
      success: true,
      data: {
        ...artist.toObject(),
        tracks,
        albums: await withPublicSongs(albums),
        relatedArtists,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
