const Album = require('../models/Album');
const { escapeRegex } = require('../utils/ids');
const Song = require('../models/Song');
const { PUBLIC_SONG_FILTER } = Song;
const { withPublicSongs } = require('../services/publicAlbums');

// Album công khai (dữ liệu cũ chưa có status vẫn được coi là công khai)
const PUBLIC_ALBUM_FILTER = { status: { $nin: ['draft', 'hidden'] } };
const Artist = require('../models/Artist');

// Album của trang nghệ sĩ bị admin ẩn / chủ trang bị khoá cũng ẩn theo (giai đoạn 5)
const visibleAlbums = async (filter) => {
  const hidden = await Artist.distinct('id', { $or: [{ hiddenAt: { $ne: null } }, { ownerLockedAt: { $ne: null } }] });
  return hidden.length ? { ...filter, artistId: { $nin: hidden } } : filter;
};

// Lấy tất cả Album
exports.getAllAlbums = async (req, res) => {
  try {
    const albums = await Album.find(await visibleAlbums(PUBLIC_ALBUM_FILTER));
    res.status(200).json({ success: true, count: albums.length, data: await withPublicSongs(albums) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy danh sách Album thịnh hành (Trending Albums)
exports.getTrendingAlbums = async (req, res) => {
  try {
    const albums = await Album.find(await visibleAlbums({ isTrending: true, ...PUBLIC_ALBUM_FILTER }));
    res.status(200).json({ success: true, count: albums.length, data: await withPublicSongs(albums) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy chi tiết Album và kèm toàn bộ bài hát trong Album đó
exports.getAlbumById = async (req, res) => {
  try {
    const album = await Album.findOne(await visibleAlbums({ id: req.params.id, ...PUBLIC_ALBUM_FILTER }));
    if (!album) return res.status(404).json({ success: false, message: 'Không tìm thấy Album.' });

    // Lấy chi tiết các bài hát thuộc album này
    const tracks = await Song.find({ id: { $in: album.songIds }, ...PUBLIC_SONG_FILTER });
    const sortedTracks = album.songIds.map((id) => tracks.find((t) => t.id === id)).filter(Boolean);

    res.status(200).json({
      success: true,
      data: {
        ...album.toObject(),
        songIds: sortedTracks.map((t) => t.id),
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
    const albums = await Album.find(await visibleAlbums({ artist: new RegExp(`^${escapeRegex(artistName)}$`, 'i'), ...PUBLIC_ALBUM_FILTER }));
    res.status(200).json({ success: true, count: albums.length, data: await withPublicSongs(albums) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
