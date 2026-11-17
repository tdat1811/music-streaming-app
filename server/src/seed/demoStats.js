// Dữ liệu thống kê giả lập cho `npm run seed` (giai đoạn 4): 90 ngày lượt nghe, theo dõi, thích, thêm vào playlist
// cho nghệ sĩ có tài khoản dùng thử (Mer Watson), để màn Stats có biểu đồ khi demo.
// Kết quả cố định (không dùng Math.random) nên mỗi lần seed cho cùng một hình dạng biểu đồ.

const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_DAYS = 90;
const LISTENER_POOL = 600;

// Tỉ lệ nguồn lượt nghe thông thường và trong tuần đầu bài mới ra (fan đến từ Feed nhiều hơn)
const SOURCE_WEIGHTS = [['search', 34], ['feed', 20], ['artist', 16], ['home', 12], ['playlist', 8], ['album', 6], ['library', 4]];
const RELEASE_WEIGHTS = [['feed', 42], ['artist', 22], ['search', 20], ['home', 8], ['playlist', 4], ['album', 2], ['library', 2]];

// Bộ sinh số ngẫu nhiên có hạt giống (mulberry32)
const makeRandom = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pickWeighted = (rand, weights) => {
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of weights) {
    r -= w;
    if (r < 0) return value;
  }
  return weights[0][0];
};

/**
 * @param {object} opts
 * @param {string} opts.artistId
 * @param {{id: string, weight?: number}[]} opts.songs  bài đã có từ trước (weight = độ phổ biến tương đối)
 * @param {{id: string, daysAgo: number}|null} opts.newSong  bài mới ra cách đây `daysAgo` ngày (tạo cột nhảy vọt)
 * @param {string[]} opts.userIds  tài khoản người nghe thật trong dữ liệu mẫu
 * @param {Date} opts.now
 * @returns {{ playEvents: object[], activityEvents: object[], playsBySong: Record<string, number>, netFollowers: number }}
 */
const buildDemoStats = ({ artistId, songs, newSong = null, userIds = [], now = new Date(), days = DEMO_DAYS, seed = 20261116 }) => {
  const rand = makeRandom(seed);
  const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
  // Vài người nghe quen (nghe nhiều), còn lại là người nghe vãng lai
  const listener = () => {
    if (userIds.length && rand() < 0.04) return `u:${userIds[int(0, userIds.length - 1)]}`;
    const n = rand() < 0.45 ? int(1, 60) : int(1, LISTENER_POOL);
    return `demo:${n}`;
  };
  const playEvents = [];
  const activityEvents = [];
  const playsBySong = {};
  let netFollowers = 0;
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const atDay = (d) => {
    // Hôm nay chỉ tạo sự kiện trước thời điểm hiện tại; ngày khác rải từ 6h đến 24h
    const dayStart = startToday - d * DAY_MS;
    const span = d === 0 ? Math.max(60 * 1000, now.getTime() - dayStart) : DAY_MS;
    const t = d === 0 ? rand() * span : (0.25 + rand() * 0.75) * span;
    return new Date(dayStart + Math.min(t, span - 1));
  };
  const addPlay = (songId, d, weights) => {
    playEvents.push({ songId, artistId, listenerKey: listener(), source: pickWeighted(rand, weights), demo: true, createdAt: atDay(d) });
    playsBySong[songId] = (playsBySong[songId] || 0) + 1;
  };
  const addActivity = (type, d, songId = null) => {
    activityEvents.push({ type, artistId, songId, userId: `demo_${int(1, LISTENER_POOL)}`, demo: true, createdAt: atDay(d) });
  };
  const songWeights = songs.map((s) => [s.id, s.weight || 1]);

  for (let d = days - 1; d >= 0; d--) {
    const progress = (days - 1 - d) / (days - 1); // 0 (cũ nhất) → 1 (hôm nay)
    const weekday = new Date(startToday - d * DAY_MS).getDay();
    const weekend = weekday === 0 || weekday === 6 ? 1.35 : 1;
    // Hôm nay mới trôi qua một phần ngày
    const partial = d === 0 ? Math.max(0.15, (now.getTime() - startToday) / DAY_MS) : 1;
    const base = Math.round((18 + 42 * progress) * weekend * (0.8 + rand() * 0.4) * partial);
    for (let i = 0; i < base; i++) addPlay(pickWeighted(rand, songWeights), d, SOURCE_WEIGHTS);

    // Bài mới: ngày ra mắt nghe rất nhiều rồi giảm dần về mức ổn định
    const sinceRelease = newSong ? newSong.daysAgo - d : -1;
    if (sinceRelease >= 0) {
      const spike = Math.round((26 + 130 * Math.exp(-sinceRelease / 2.2)) * weekend * (0.85 + rand() * 0.3) * partial);
      for (let i = 0; i < spike; i++) addPlay(newSong.id, d, sinceRelease < 7 ? RELEASE_WEIGHTS : SOURCE_WEIGHTS);
    }

    const buzz = sinceRelease >= 0 && sinceRelease < 5 ? 3 : 1;
    const follows = Math.round(int(0, 3) * buzz * partial);
    for (let i = 0; i < follows; i++) addActivity('follow', d);
    const unfollows = rand() < 0.18 * partial ? 1 : 0;
    for (let i = 0; i < unfollows; i++) addActivity('unfollow', d);
    netFollowers += follows - unfollows;

    const likeTargets = sinceRelease >= 0 ? [...songWeights, [newSong.id, 4 * buzz]] : songWeights;
    const likes = Math.round(int(0, 4) * buzz * partial);
    for (let i = 0; i < likes; i++) addActivity('like', d, pickWeighted(rand, likeTargets));
    if (rand() < 0.12 * partial) addActivity('unlike', d, pickWeighted(rand, likeTargets));
    const adds = Math.round(int(0, 2) * (buzz > 1 ? 2 : 1) * partial);
    for (let i = 0; i < adds; i++) addActivity('playlist_add', d, pickWeighted(rand, likeTargets));
  }

  return { playEvents, activityEvents, playsBySong, netFollowers };
};

module.exports = { buildDemoStats, DEMO_DAYS };
