const mongoose = require('mongoose');

const chartSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: 'Global' },
    updateText: { type: String, default: 'Daily chart-toppers update' },
    coverImage: { type: String, default: '' },
    songIds: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Chart', chartSchema);
