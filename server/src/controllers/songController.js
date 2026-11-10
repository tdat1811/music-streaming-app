const Song = require('../models/Song');

// Lấy toàn bộ bài hát
exports.getAllSongs = async (req, res) => {
  try {
    const songs = await Song.find();
    res.status(200).json({ success: true, count: songs.length, data: songs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy danh sách gợi ý Trang chủ (Suggestions for you)
exports.getSuggestions = async (req, res) => {
  try {
    const songs = await Song.find({ category: 'suggestions' });
    res.status(200).json({ success: true, count: songs.length, data: songs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy chi tiết 1 bài hát theo ID
exports.getSongById = async (req, res) => {
  try {
    const song = await Song.findOne({ id: req.params.id });
    if (!song) return res.status(404).json({ success: false, message: 'Không tìm thấy bài hát.' });
    res.status(200).json({ success: true, data: song });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy danh sách bài hát theo mảng IDs (dùng khi mở Playlist hoặc Album)
exports.getSongsByIds = async (req, res) => {
  try {
    const { ids } = req.body; // array of string ids
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: 'Tham số ids phải là mảng chuỗi.' });
    }
    const songs = await Song.find({ id: { $in: ids } });
    // Sắp xếp đúng theo thứ tự trong mảng ids gửi lên
    const sorted = ids.map((id) => songs.find((s) => s.id === id)).filter(Boolean);
    res.status(200).json({ success: true, count: sorted.length, data: sorted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Tìm kiếm bài hát & gợi ý tự động (Autocomplete)
exports.search = async (req, res) => {
  try {
    const { q = '' } = req.query;
    const query = q.trim();

    if (!query) {
      // Khi chưa gõ gì, trả về danh sách các tiêu đề bài hát thực tế làm gợi ý
      const songs = await Song.find().limit(15);
      const suggestions = songs.map((s) => s.title);
      return res.status(200).json({
        success: true,
        suggestions,
        songs,
      });
    }

    // Tìm kiếm regex theo tên bài hát hoặc tên nghệ sĩ
    const regex = new RegExp(query, 'i');
    const matchedSongs = await Song.find({
      $or: [{ title: regex }, { artist: regex }],
    });

    const suggestions = Array.from(new Set(matchedSongs.map((s) => s.title)));

    res.status(200).json({
      success: true,
      count: matchedSongs.length,
      suggestions,
      songs: matchedSongs,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
