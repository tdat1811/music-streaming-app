const express = require('express');
const router = express.Router();
const Artist = require('../models/Artist');
const Song = require('../models/Song');

// Giai đoạn 5 – API công khai: id các trang nghệ sĩ và bài hát đang bị ẩn
// (admin ẩn trang / chủ trang bị khoá / bài bị gỡ). App dùng để lọc dữ liệu mẫu có sẵn trên máy,
// vì dữ liệu đó không đi qua máy chủ. Chỉ trả id + tên, không có lý do hay thông tin tài khoản.
router.get('/hidden', async (req, res) => {
  try {
    const [artists, songIds] = await Promise.all([
      Artist.find({ $or: [{ hiddenAt: { $ne: null } }, { ownerLockedAt: { $ne: null } }] }).select('id name').lean(),
      Song.distinct('id', { $or: [{ removedAt: { $ne: null } }, { suspendedAt: { $ne: null } }] }),
    ]);
    res.status(200).json({
      success: true,
      data: { artists: artists.map((a) => ({ id: a.id, name: a.name })), songIds },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
