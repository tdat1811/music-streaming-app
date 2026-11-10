const Playlist = require('../models/Playlist');
const Song = require('../models/Song');

// Lấy danh sách Playlist của một User
exports.getUserPlaylists = async (req, res) => {
  try {
    const { userId } = req.params;
    const playlists = await Playlist.find({ ownerId: userId });
    res.status(200).json({ success: true, count: playlists.length, data: playlists });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy chi tiết 1 Playlist kèm thông tin các bài hát bên trong
exports.getPlaylistById = async (req, res) => {
  try {
    const playlist = await Playlist.findOne({ id: req.params.id });
    if (!playlist) return res.status(404).json({ success: false, message: 'Không tìm thấy Playlist.' });

    const tracks = await Song.find({ id: { $in: playlist.songIds } });
    const sortedTracks = playlist.songIds.map((id) => tracks.find((t) => t.id === id)).filter(Boolean);

    res.status(200).json({
      success: true,
      data: {
        ...playlist.toObject(),
        tracks: sortedTracks,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Tạo Playlist mới
exports.createPlaylist = async (req, res) => {
  try {
    const { userId, title, description, coverImage } = req.body;
    if (!userId || !title) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp userId và tiêu đề playlist.' });
    }

    const trimmedTitle = title.trim();
    const existing = await Playlist.findOne({
      ownerId: userId,
      title: new RegExp(`^${trimmedTitle}$`, 'i'),
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Bạn đã có playlist với tên này.' });
    }

    const count = await Playlist.countDocuments();
    const newPlaylist = await Playlist.create({
      id: `p${count + 1}`,
      ownerId: userId,
      title: trimmedTitle,
      description: description || 'Custom playlist',
      coverImage: coverImage || '',
      songIds: [],
    });

    res.status(201).json({
      success: true,
      message: 'Tạo playlist thành công!',
      data: newPlaylist,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Thêm bài hát vào Playlist
exports.addSongToPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.body;
    const playlist = await Playlist.findOne({ id: playlistId });
    if (!playlist) return res.status(404).json({ success: false, message: 'Không tìm thấy Playlist.' });

    if (playlist.songIds.includes(songId)) {
      return res.status(400).json({ success: false, message: 'Bài hát đã có trong Playlist này.' });
    }

    playlist.songIds.push(songId);
    await playlist.save();

    res.status(200).json({
      success: true,
      message: 'Đã thêm bài hát vào Playlist!',
      data: playlist,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Xóa bài hát khỏi Playlist
exports.removeSongFromPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.body;
    const playlist = await Playlist.findOne({ id: playlistId });
    if (!playlist) return res.status(404).json({ success: false, message: 'Không tìm thấy Playlist.' });

    playlist.songIds = playlist.songIds.filter((id) => id !== songId);
    await playlist.save();

    res.status(200).json({
      success: true,
      message: 'Đã xóa bài hát khỏi Playlist!',
      data: playlist,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Xóa Playlist
exports.deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    await Playlist.findOneAndDelete({ id });
    res.status(200).json({ success: true, message: 'Đã xóa playlist thành công.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
