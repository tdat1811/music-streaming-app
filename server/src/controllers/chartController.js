const Chart = require('../models/Chart');
const Song = require('../models/Song');

// Lấy tất cả bảng xếp hạng
exports.getAllCharts = async (req, res) => {
  try {
    const charts = await Chart.find();
    res.status(200).json({ success: true, count: charts.length, data: charts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy chi tiết Bảng xếp hạng kèm danh sách bài hát
exports.getChartById = async (req, res) => {
  try {
    const chart = await Chart.findOne({ id: req.params.id });
    if (!chart) return res.status(404).json({ success: false, message: 'Không tìm thấy bảng xếp hạng.' });

    const tracks = await Song.find({ id: { $in: chart.songIds } });
    const sortedTracks = chart.songIds.map((id) => tracks.find((t) => t.id === id)).filter(Boolean);

    res.status(200).json({
      success: true,
      data: {
        ...chart.toObject(),
        tracks: sortedTracks,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
