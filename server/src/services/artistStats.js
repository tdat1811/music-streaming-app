// Tổng hợp số liệu cho màn Stats của Artist Studio (giai đoạn 4)
const Song = require('../models/Song');
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const FeedPost = require('../models/FeedPost');
const Comment = require('../models/Comment');
const PlayEvent = require('../models/PlayEvent');
const ActivityEvent = require('../models/ActivityEvent');
const { parseCount } = require('../utils/legacyData');
const {
  rangeWindow,
  percentChange,
  bucketByDay,
  lastMonthKeys,
  monthKey,
  monthStart,
  dayKey,
  sourceBreakdown,
  countBy,
} = require('../utils/stats');

const TOP_SONGS = 5;
const SONG_FIELDS = 'id title coverImage duration plays status createdAt followersNotifiedAt';

const playsOf = (song) => (typeof song.plays === 'number' ? song.plays : parseCount(song.plays));
// Ngày bài hát ra mắt: lần đầu được đăng công khai (bài cũ chưa có mốc này thì lấy ngày tạo)
const releasedAt = (song) => song.followersNotifiedAt || song.createdAt || null;

const playsIn = (match, from, to) =>
  PlayEvent.find({ ...match, createdAt: { $gte: from, $lt: to } }).select('songId listenerKey source createdAt').lean();

const activityCounts = async (match, from, to) => {
  const time = from ? { createdAt: { $gte: from, $lt: to } } : {};
  const rows = await ActivityEvent.aggregate([{ $match: { ...match, ...time } }, { $group: { _id: '$type', n: { $sum: 1 } } }]);
  const c = { follow: 0, unfollow: 0, like: 0, unlike: 0, playlist_add: 0 };
  rows.forEach((r) => { c[r._id] = r.n; });
  return c;
};

// Tương tác giả lập do lệnh seed tạo không gắn với tài khoản / playlist thật,
// nên tổng "từ trước tới nay" phải cộng thêm phần này để khớp với số theo kỳ.
const demoCounts = (match) => activityCounts({ ...match, demo: true });

const distinctCount = (events) => new Set(events.map((e) => e.listenerKey)).size;

const songCard = (song) => ({ id: song.id, title: song.title, coverImage: song.coverImage || '', status: song.status || 'published' });

// Thích / bình luận / chia sẻ trên các bài đăng của nghệ sĩ (đăng trong khoảng thời gian; không có khoảng = tất cả)
const feedSummary = async (artistId, from, to) => {
  const time = from ? { createdAt: { $gte: from, $lt: to } } : {};
  const posts = await FeedPost.find({ authorArtistId: artistId, ...time }).select('id likes shares').lean();
  const comments = posts.length
    ? await Comment.find({ postId: { $in: posts.map((p) => p.id) } }).select('replies').lean()
    : [];
  return {
    posts: posts.length,
    likes: posts.reduce((s, p) => s + (p.likes || 0), 0),
    comments: comments.reduce((s, c) => s + 1 + (c.replies ? c.replies.length : 0), 0),
    shares: posts.reduce((s, p) => s + (p.shares || 0), 0),
  };
};

// Ngày bắt đầu có thống kê chi tiết = lượt nghe đầu tiên được ghi
const statsSinceOf = async (match) => (await PlayEvent.findOne(match).sort({ createdAt: 1 }).select('createdAt').lean())?.createdAt || null;

// Gắn tên bài ra mắt vào đúng cột (ngày hoặc tháng) của biểu đồ
const withReleases = (series, songs, keyOf) => {
  const byKey = {};
  songs.forEach((s) => {
    const d = releasedAt(s);
    if (!d || s.status === 'draft') return;
    (byKey[keyOf(d)] = byKey[keyOf(d)] || []).push(s.title);
  });
  return series.map((p) => ({ ...p, releases: byKey[p.key] || [] }));
};

// ---- Biểu đồ + nguồn cho "All time": theo tháng, lượt nghe cũ (không rõ ngày / nguồn) gộp riêng ----
const allTimeSeries = async (match, totalPlays, now, tz) => {
  const keys = lastMonthKeys(now, 12, tz);
  const events = await PlayEvent.find({ ...match, createdAt: { $gte: monthStart(keys[0], tz) } }).select('createdAt').lean();
  const counts = countBy(events, (e) => monthKey(e.createdAt, tz));
  const months = keys.map((key) => ({ key, plays: counts[key] || 0 }));
  const inMonths = months.reduce((s, m) => s + m.plays, 0);
  return { months, before: Math.max(0, totalPlays - inMonths) };
};

const allTimeSources = async (match, totalPlays) => {
  const rows = await PlayEvent.aggregate([{ $match: match }, { $group: { _id: '$source', n: { $sum: 1 } } }]);
  const counts = {};
  let tracked = 0;
  rows.forEach((r) => { counts[r._id || 'other'] = r.n; tracked += r.n; });
  const unknown = Math.max(0, totalPlays - tracked);
  if (unknown) counts.unknown = unknown;
  return sourceBreakdown(counts, Math.max(totalPlays, tracked));
};

// ======================= Toàn bộ bài của nghệ sĩ =======================
const getArtistStats = async (artist, { range = '7', tz, now = new Date() } = {}) => {
  const match = { artistId: artist.id };
  const [songs, statsSince] = await Promise.all([
    Song.find({ artistId: artist.id }).select(SONG_FIELDS).lean(),
    statsSinceOf(match),
  ]);
  const songById = Object.fromEntries(songs.map((s) => [s.id, s]));
  const totalPlays = songs.reduce((s, x) => s + playsOf(x), 0);
  const base = { range, tz, statsSince, songs: songs.length, totalPlays, followersTotal: artist.followersCount || 0 };

  if (range === 'all') {
    const songIds = songs.map((s) => s.id);
    const [listenerKeys, acts, demo, likeRows, chart, sources, feed] = await Promise.all([
      PlayEvent.distinct('listenerKey', match),
      activityCounts(match),
      demoCounts(match),
      songIds.length
        ? User.aggregate([{ $unwind: '$likedSongIds' }, { $match: { likedSongIds: { $in: songIds } } }, { $count: 'n' }])
        : [],
      allTimeSeries(match, totalPlays, now, tz),
      allTimeSources(match, totalPlays),
      feedSummary(artist.id),
    ]);
    const firstSong = songs.map((s) => s.createdAt).filter(Boolean).sort((a, b) => a - b)[0] || null;
    return {
      ...base,
      hasPlays: totalPlays > 0,
      tiles: {
        plays: { value: totalPlays, since: firstSong },
        listeners: { value: listenerKeys.length, since: statsSince },
        followers: { value: artist.followersCount || 0, followed: acts.follow, unfollowed: acts.unfollow },
        songLikes: { value: (likeRows[0]?.n || 0) + Math.max(0, demo.like - demo.unlike), songs: songs.length },
      },
      seriesUnit: 'month',
      series: withReleases(chart.months, songs, (d) => monthKey(d, tz)),
      before: chart.before,
      topSongs: [...songs]
        .filter((s) => playsOf(s) > 0)
        .sort((a, b) => playsOf(b) - playsOf(a))
        .slice(0, TOP_SONGS)
        .map((s) => ({ ...songCard(s), plays: playsOf(s) })),
      sources,
      followers: { total: artist.followersCount || 0, followed: acts.follow, unfollowed: acts.unfollow, net: acts.follow - acts.unfollow },
      feed,
    };
  }

  const days = Number(range);
  const w = rangeWindow(days, now, tz);
  const [cur, prev, acts, prevActs, feed] = await Promise.all([
    playsIn(match, w.from, w.to),
    playsIn(match, w.prevFrom, w.prevTo),
    activityCounts(match, w.from, w.to),
    activityCounts(match, w.prevFrom, w.prevTo),
    feedSummary(artist.id, w.from, w.to),
  ]);
  const curBySong = countBy(cur, (e) => e.songId);
  const prevBySong = countBy(prev, (e) => e.songId);
  const netFollow = acts.follow - acts.unfollow;
  const netLike = acts.like - acts.unlike;

  return {
    ...base,
    from: w.from,
    to: w.to,
    hasPlays: cur.length > 0,
    tiles: {
      plays: { value: cur.length, change: percentChange(cur.length, prev.length) },
      listeners: { value: distinctCount(cur), change: percentChange(distinctCount(cur), distinctCount(prev)) },
      newFollowers: { value: netFollow, change: percentChange(netFollow, prevActs.follow - prevActs.unfollow) },
      songLikes: { value: netLike, change: percentChange(netLike, prevActs.like - prevActs.unlike) },
    },
    seriesUnit: 'day',
    series: withReleases(bucketByDay(cur.map((e) => e.createdAt), w.from, days, tz), songs, (d) => dayKey(d, tz)),
    topSongs: Object.entries(curBySong)
      .filter(([id]) => songById[id])
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, TOP_SONGS)
      .map(([id, plays]) => ({ ...songCard(songById[id]), plays, change: percentChange(plays, prevBySong[id] || 0) })),
    sources: sourceBreakdown(countBy(cur, (e) => e.source || 'other')),
    followers: { total: artist.followersCount || 0, followed: acts.follow, unfollowed: acts.unfollow, net: netFollow },
    feed,
  };
};

// ======================= Một bài hát =======================
const getSongStats = async (song, { range = '7', tz, now = new Date() } = {}) => {
  const match = { songId: song.id };
  const total = playsOf(song);
  const base = {
    range,
    tz,
    statsSince: await statsSinceOf(match),
    song: { ...songCard(song), duration: song.duration || '', releasedAt: releasedAt(song) },
    allTimePlays: total,
  };
  const actMatch = { artistId: song.artistId, songId: song.id };

  if (range === 'all') {
    const [likes, playlists, demo, chart, sources] = await Promise.all([
      User.countDocuments({ likedSongIds: song.id }),
      Playlist.countDocuments({ songIds: song.id }),
      demoCounts(actMatch),
      allTimeSeries(match, total, now, tz),
      allTimeSources(match, total),
    ]);
    return {
      ...base,
      hasPlays: total > 0,
      tiles: {
        plays: { value: total },
        likes: { value: likes + Math.max(0, demo.like - demo.unlike) },
        playlistAdds: { value: playlists + demo.playlist_add },
      },
      seriesUnit: 'month',
      series: withReleases(chart.months, [song], (d) => monthKey(d, tz)),
      before: chart.before,
      sources,
    };
  }

  const days = Number(range);
  const w = rangeWindow(days, now, tz);
  const [cur, prev, acts] = await Promise.all([
    playsIn(match, w.from, w.to),
    playsIn(match, w.prevFrom, w.prevTo),
    activityCounts(actMatch, w.from, w.to),
  ]);
  return {
    ...base,
    from: w.from,
    to: w.to,
    hasPlays: cur.length > 0,
    tiles: {
      plays: { value: cur.length, change: percentChange(cur.length, prev.length) },
      likes: { value: acts.like - acts.unlike },
      playlistAdds: { value: acts.playlist_add },
    },
    seriesUnit: 'day',
    series: withReleases(bucketByDay(cur.map((e) => e.createdAt), w.from, days, tz), [song], (d) => dayKey(d, tz)),
    sources: sourceBreakdown(countBy(cur, (e) => e.source || 'other')),
  };
};

// Tóm tắt 7 ngày cho trang chính Artist Studio (dòng nhỏ dưới ô Total plays / Followers và mục Stats)
const getWeekSummary = async (artist, { tz, now = new Date() } = {}) => {
  const match = { artistId: artist.id };
  const w = rangeWindow(7, now, tz);
  const [cur, prev, acts] = await Promise.all([
    PlayEvent.countDocuments({ ...match, createdAt: { $gte: w.from, $lt: w.to } }),
    PlayEvent.countDocuments({ ...match, createdAt: { $gte: w.prevFrom, $lt: w.prevTo } }),
    activityCounts(match, w.from, w.to),
  ]);
  return { plays: cur, playsChange: percentChange(cur, prev), newFollowers: acts.follow - acts.unfollow };
};

module.exports = { getArtistStats, getSongStats, getWeekSummary, SONG_FIELDS };
