// Tiện ích thuần cho thống kê nghệ sĩ (giai đoạn 4): khoảng thời gian, gộp theo ngày / tháng, % thay đổi, nguồn lượt nghe

const DAY_MS = 24 * 60 * 60 * 1000;
// Cùng một người nghe chỉ được tính 1 lượt / bài trong khoảng này
const PLAY_DEDUPE_MS = 10 * 60 * 1000;
// Mỗi IP gọi API tính lượt nghe tối đa bấy nhiêu lần / phút
const PLAY_RATE_LIMIT = { max: 60, windowMs: 60 * 1000 };

const RANGES = ['7', '30', 'all'];
const parseRange = (value) => (RANGES.includes(String(value)) ? String(value) : '7');

// Nơi người nghe bấm phát bài hát
const PLAY_SOURCES = ['search', 'home', 'artist', 'album', 'playlist', 'feed', 'library', 'other'];
const normalizeSource = (value) => (PLAY_SOURCES.includes(value) ? value : 'other');

// Múi giờ của người xem (phút lệch so với UTC, VD Việt Nam = 420); sai / thiếu thì dùng giờ Việt Nam
const DEFAULT_TZ = 420;
const parseTz = (value) => {
  const n = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(n) && n >= -720 && n <= 840 ? Math.round(n) : DEFAULT_TZ;
};

const pad = (n) => String(n).padStart(2, '0');
const shifted = (date, tz) => new Date(new Date(date).getTime() + tz * 60 * 1000);
// "2026-11-16" theo giờ của người xem
const dayKey = (date, tz = DEFAULT_TZ) => {
  const d = shifted(date, tz);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
const monthKey = (date, tz = DEFAULT_TZ) => dayKey(date, tz).slice(0, 7);

// Thời điểm 00:00 (giờ người xem) của ngày chứa `date`
const startOfDay = (date, tz = DEFAULT_TZ) => {
  const d = shifted(date, tz);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - tz * 60 * 1000);
};

// Khoảng "N ngày gần nhất" gồm cả hôm nay, và khoảng liền trước cùng độ dài để so sánh
const rangeWindow = (days, now = new Date(), tz = DEFAULT_TZ) => {
  const to = new Date(startOfDay(now, tz).getTime() + DAY_MS);
  const from = new Date(to.getTime() - days * DAY_MS);
  return { from, to, prevFrom: new Date(from.getTime() - days * DAY_MS), prevTo: from };
};

// % thay đổi so với kỳ trước (làm tròn). Kỳ trước = 0: không tính được % → null (trừ khi cả hai cùng 0 → 0)
const percentChange = (current, previous) => {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
};

// Gộp sự kiện theo ngày: luôn trả đủ `days` phần tử, ngày không có sự kiện = 0
const bucketByDay = (dates, from, days, tz = DEFAULT_TZ) => {
  const counts = {};
  dates.forEach((d) => {
    const k = dayKey(d, tz);
    counts[k] = (counts[k] || 0) + 1;
  });
  return Array.from({ length: days }, (_, i) => {
    // +12 giờ để không lệch ngày khi cộng dồn
    const key = dayKey(new Date(from.getTime() + i * DAY_MS + DAY_MS / 2), tz);
    return { key, plays: counts[key] || 0 };
  });
};

// Các tháng gần nhất (cũ → mới), tháng cuối là tháng hiện tại
const lastMonthKeys = (now = new Date(), months = 12, tz = DEFAULT_TZ) => {
  const d = shifted(now, tz);
  return Array.from({ length: months }, (_, i) => {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - (months - 1 - i), 1));
    return `${m.getUTCFullYear()}-${pad(m.getUTCMonth() + 1)}`;
  });
};

// Thời điểm bắt đầu của tháng "2026-11" theo giờ người xem
const monthStart = (key, tz = DEFAULT_TZ) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1) - tz * 60 * 1000);
};

// { search: 5, feed: 3 } → [{ source, plays, percent }] xếp giảm dần; percent tính trên `total` (mặc định tổng các nguồn)
const sourceBreakdown = (counts, total) => {
  const sum = total ?? Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.entries(counts)
    .filter(([, plays]) => plays > 0)
    .map(([source, plays]) => ({ source, plays, percent: sum ? Math.round((plays / sum) * 100) : 0 }))
    .sort((a, b) => b.plays - a.plays || a.source.localeCompare(b.source));
};

const countBy = (items, keyOf) =>
  items.reduce((acc, item) => {
    const k = keyOf(item);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

module.exports = {
  DAY_MS,
  PLAY_DEDUPE_MS,
  PLAY_RATE_LIMIT,
  RANGES,
  PLAY_SOURCES,
  DEFAULT_TZ,
  parseRange,
  parseTz,
  normalizeSource,
  dayKey,
  monthKey,
  startOfDay,
  rangeWindow,
  percentChange,
  bucketByDay,
  lastMonthKeys,
  monthStart,
  sourceBreakdown,
  countBy,
};
