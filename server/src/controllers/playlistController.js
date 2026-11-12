const Playlist = require('../models/Playlist');
const Song = require('../models/Song');
const User = require('../models/User');
const { isVipUser, VIP_REQUIRED_MESSAGE } = require('../config/plans');
const { makeId, escapeRegex } = require('../utils/ids');

const NOT_OWNER_MESSAGE = 'Bạn chỉ được chỉnh sửa playlist của chính mình.';

// Tìm playlist và kiểm tra người gọi (theo token) là chủ sở hữu.
// Trả về playlist, hoặc null sau khi đã gửi phản hồi lỗi.
const findOwnedPlaylist = async (req, res, playlistId) => {
  const playlist = await Playlist.findOne({ id: playlistId });
  if (!playlist) {
    res.status(404).json({ success: false, message: 'Không tìm thấy Playlist.' });
    return null;
  }
  if (playlist.ownerId !== req.userId) {
    res.status(403).json({ success: false, message: NOT_OWNER_MESSAGE });
    return null;
  }
  return playlist;
};

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
    const userId = req.userId;
    const { title, description, coverImage } = req.body;
    if (!userId || !title) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp userId và tiêu đề playlist.' });
    }

    // Tạo playlist là tính năng dành cho thành viên VIP
    const owner = await User.findOne({ id: userId });
    if (!owner) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    if (!isVipUser(owner)) {
      return res.status(403).json({ success: false, message: VIP_REQUIRED_MESSAGE });
    }

    const trimmedTitle = title.trim();
    const existing = await Playlist.findOne({
      ownerId: userId,
      // Thoát ký tự đặc biệt để tên như "Chill (2024)" không làm hỏng biểu thức
      title: new RegExp(`^${escapeRegex(trimmedTitle)}$`, 'i'),
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Bạn đã có playlist với tên này.' });
    }

    const newPlaylist = await Playlist.create({
      id: makeId('p'),
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
    if (!(await findOwnedPlaylist(req, res, playlistId))) return;

    // Cập nhật nguyên tử: thêm nhiều bài cùng lúc (cả album) không làm mất bài nào
    const playlist = await Playlist.findOneAndUpdate(
      { id: playlistId, songIds: { $ne: songId } },
      { $push: { songIds: songId } },
      { new: true }
    );
    if (!playlist) {
      const exists = await Playlist.exists({ id: playlistId });
      return exists
        ? res.status(400).json({ success: false, message: 'Bài hát đã có trong Playlist này.' })
        : res.status(404).json({ success: false, message: 'Không tìm thấy Playlist.' });
    }

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
    if (!(await findOwnedPlaylist(req, res, playlistId))) return;

    const playlist = await Playlist.findOneAndUpdate(
      { id: playlistId },
      { $pull: { songIds: songId } },
      { new: true }
    );
    if (!playlist) return res.status(404).json({ success: false, message: 'Không tìm thấy Playlist.' });

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
    if (!(await findOwnedPlaylist(req, res, id))) return;
    await Playlist.deleteOne({ id });
    res.status(200).json({ success: true, message: 'Đã xóa playlist thành công.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
