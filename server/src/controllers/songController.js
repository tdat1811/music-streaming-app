const Song = require('../models/Song');
const { PUBLIC_SONG_FILTER } = Song;
const { fuzzySearch } = require('../utils/fuzzySearch');
const fs = require('fs');
const path = require('path');
const { AUDIO_DIR } = require('../config/storage');
const { parseCount } = require('../utils/legacyData');
const { allowRequest, checkPlay, savePlay } = require('../services/playEvents');

// Lấy toàn bộ bài hát
exports.getAllSongs = async (req, res) => {
  try {
    const songs = await Song.find(PUBLIC_SONG_FILTER);
    res.status(200).json({ success: true, count: songs.length, data: songs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy danh sách gợi ý Trang chủ (Suggestions for you)
exports.getSuggestions = async (req, res) => {
  try {
    const songs = await Song.find({ category: 'suggestions', ...PUBLIC_SONG_FILTER });
    res.status(200).json({ success: true, count: songs.length, data: songs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy chi tiết 1 bài hát theo ID
exports.getSongById = async (req, res) => {
  try {
    const song = await Song.findOne({ id: req.params.id, ...PUBLIC_SONG_FILTER });
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
    const songs = await Song.find({ id: { $in: ids }, ...PUBLIC_SONG_FILTER });
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
      const songs = await Song.find(PUBLIC_SONG_FILTER).limit(15);
      const suggestions = songs.map((s) => s.title);
      return res.status(200).json({
        success: true,
        suggestions,
        songs,
      });
    }

    // Tìm kiếm tương đối theo tên bài hát và tên nghệ sĩ (bỏ dấu, không cần đúng thứ tự,
    // chịu lỗi gõ sai), kết quả sắp theo độ liên quan. Kho nhạc nhỏ nên lọc trực tiếp trong bộ nhớ.
    const allSongs = await Song.find(PUBLIC_SONG_FILTER);
    const matchedSongs = fuzzySearch(allSongs, query, (s) => [s.title, s.artist]);

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

// Ghi nhận 1 lượt nghe: tăng plays thêm 1 (app gọi khi đã nghe đủ lâu, xem shouldCountPlay).
// Chống tăng ảo: giới hạn 60 yêu cầu / phút / IP; cùng người nghe + cùng bài trong 10 phút chỉ tính 1 lượt;
// nghệ sĩ nghe bài của chính mình không tính. Lượt không được tính vẫn trả 200 với counted = false.
exports.recordPlay = async (req, res) => {
  const filter = { id: req.params.id, ...PUBLIC_SONG_FILTER };
  try {
    if (!allowRequest(req.ip)) {
      return res.status(429).json({ success: false, code: 'RATE_LIMIT', message: 'Too many requests. Please slow down.' });
    }
    const found = await Song.collection.findOne(filter, { projection: { id: 1, artistId: 1, plays: 1 } });
    if (!found) return res.status(404).json({ success: false, message: 'Không tìm thấy bài hát.' });
    const check = await checkPlay({ song: found, userId: req.userId, ip: req.ip });
    if (!check.counted) {
      return res.status(200).json({ success: true, songId: found.id, plays: parseCount(found.plays), counted: false, reason: check.reason });
    }
    await savePlay({ song: found, listenerKey: check.listenerKey, source: req.body?.source });

    let song;
    try {
      song = await Song.findOneAndUpdate(filter, { $inc: { plays: 1 } }, { new: true }).select('id plays');
    } catch (err) {
      // Database chưa chạy script migrate: plays còn dạng chuỗi ("12.8M") nên $inc báo lỗi.
      // Đổi riêng bài này sang số rồi cộng 1 (đọc thẳng collection vì schema không đọc được chuỗi).
      if (err.code !== 14 && !/non-numeric/i.test(err.message)) throw err;
      const raw = await Song.collection.findOne(filter, { projection: { id: 1, plays: 1 } });
      if (!raw) return res.status(404).json({ success: false, message: 'Không tìm thấy bài hát.' });
      const plays = parseCount(raw.plays) + 1;
      await Song.collection.updateOne({ _id: raw._id }, { $set: { plays } });
      song = { id: raw.id, plays };
    }
    if (!song) return res.status(404).json({ success: false, message: 'Không tìm thấy bài hát.' });
    res.status(200).json({ success: true, songId: song.id, plays: song.plays, counted: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Phát stream bài hát trực tiếp (hỗ trợ HTTP Range requests cho seeking trên mọi thiết bị)
exports.streamSong = async (req, res) => {
  try {
    const { id } = req.params;
    const audioDir = AUDIO_DIR;
    const candidates = [
      path.join(audioDir, `${id}.m4a`),
      path.join(audioDir, `${id}.mp3`),
      path.join(audioDir, `${id}.mp4`),
    ];

    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }

    // Nếu chưa có file cục bộ, tìm trong DB để lấy audioUrl dự phòng
    const song = await Song.findOne({ id });
    if (song && song.audioUrl && !song.audioUrl.includes('localhost')) {
      return res.redirect(song.audioUrl);
    }

    return res.status(404).json({ success: false, message: 'File âm thanh chưa sẵn sàng.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
