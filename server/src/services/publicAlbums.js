const Song = require('../models/Song');
const { PUBLIC_SONG_FILTER } = Song;

// Album trả về cho người nghe: songIds chỉ giữ bài đã đăng (bỏ bài nháp / bị ẩn),
// để số bài và danh sách bài hiển thị đúng với những gì người nghe nghe được.
const withPublicSongs = async (albums) => {
  const list = albums.map((a) => (a.toObject ? a.toObject() : a));
  const ids = [...new Set(list.flatMap((a) => a.songIds || []))];
  if (!ids.length) return list;
  const visible = await Song.find({ id: { $in: ids }, ...PUBLIC_SONG_FILTER }).select('id').lean();
  const ok = new Set(visible.map((s) => s.id));
  return list.map((a) => ({ ...a, songIds: (a.songIds || []).filter((id) => ok.has(id)) }));
};

module.exports = { withPublicSongs };
