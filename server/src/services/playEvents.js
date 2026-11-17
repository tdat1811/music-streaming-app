// Ghi nhận lượt nghe và tương tác kèm thời điểm (giai đoạn 4) + luật chống tăng lượt nghe ảo
const crypto = require('crypto');
const PlayEvent = require('../models/PlayEvent');
const ActivityEvent = require('../models/ActivityEvent');
const Artist = require('../models/Artist');
const Song = require('../models/Song');
const { PLAY_DEDUPE_MS, PLAY_RATE_LIMIT, normalizeSource } = require('../utils/stats');

// Khách: nhận diện bằng mã băm của IP (không lưu IP thật)
const listenerKeyOf = (userId, ip) =>
  userId ? `u:${userId}` : `ip:${crypto.createHash('sha256').update(String(ip || 'unknown')).digest('hex').slice(0, 16)}`;

// ---- Giới hạn tần suất theo IP (bộ nhớ trong tiến trình, đủ cho 1 máy chủ) ----
const hits = new Map();
const allowRequest = (ip, now = Date.now()) => {
  const key = String(ip || 'unknown');
  const recent = (hits.get(key) || []).filter((t) => now - t < PLAY_RATE_LIMIT.windowMs);
  if (recent.length >= PLAY_RATE_LIMIT.max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  // Dọn bớt khi có quá nhiều IP
  if (hits.size > 5000) {
    for (const [k, list] of hits) if (!list.some((t) => now - t < PLAY_RATE_LIMIT.windowMs)) hits.delete(k);
  }
  return true;
};
const resetPlayLimiter = () => hits.clear();

// Lượt nghe này có được tính không?
//  - nghệ sĩ nghe bài của chính mình: không tính
//  - cùng người nghe + cùng bài trong 10 phút: chỉ tính 1 lượt
// Trả về { counted, reason, listenerKey }
const checkPlay = async ({ song, userId, ip, now = new Date() }) => {
  const listenerKey = listenerKeyOf(userId, ip);
  if (userId && song.artistId) {
    const own = await Artist.exists({ id: song.artistId, ownerUserId: userId });
    if (own) return { counted: false, reason: 'own_song', listenerKey };
  }
  const recent = await PlayEvent.exists({
    songId: song.id,
    listenerKey,
    createdAt: { $gt: new Date(now.getTime() - PLAY_DEDUPE_MS) },
  });
  if (recent) return { counted: false, reason: 'duplicate', listenerKey };
  return { counted: true, reason: null, listenerKey };
};

const savePlay = ({ song, listenerKey, source, now = new Date() }) =>
  PlayEvent.create({ songId: song.id, artistId: song.artistId || null, listenerKey, source: normalizeSource(source), createdAt: now });

// Ghi tương tác (theo dõi, thích, thêm vào playlist). Lỗi ở đây không được làm hỏng thao tác chính.
const logActivity = async (type, { artistId, songId = null, userId = null }) => {
  try {
    let aid = artistId;
    if (!aid && songId) aid = (await Song.findOne({ id: songId }).select('artistId').lean())?.artistId;
    if (!aid) return;
    await ActivityEvent.create({ type, artistId: aid, songId, userId });
  } catch (err) {
    console.error('Không ghi được sự kiện thống kê:', err.message);
  }
};

module.exports = { listenerKeyOf, allowRequest, resetPlayLimiter, checkPlay, savePlay, logActivity };
