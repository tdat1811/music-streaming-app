// Kiểm thử tích hợp: giai đoạn 4 – ghi lượt nghe chống tăng ảo và thống kê cho nghệ sĩ (IT116–IT124)
const { api, auth, dangNhap, ghiKetQua } = require('../helpers/api');
const { moDb, lamMoiDuLieu, dongDb } = require('../helpers/db');
const Song = require('../../src/models/Song');
const PlayEvent = require('../../src/models/PlayEvent');
const ActivityEvent = require('../../src/models/ActivityEvent');
const FeedPost = require('../../src/models/FeedPost');
const { resetPlayLimiter } = require('../../src/services/playEvents');
const { startOfDay, dayKey, DAY_MS } = require('../../src/utils/stats');

const TZ = 420;

beforeAll(moDb);
beforeEach(async () => {
  await lamMoiDuLieu();
  resetPlayLimiter();
  // Hai bài đã đăng của Mer (ra mắt từ lâu để không lẫn vào mốc "ra bài mới" trừ khi test cần)
  const cu = new Date(Date.now() - 200 * DAY_MS);
  await Song.create([
    { id: 's_mer1', title: 'Mùa thu Hà Nội', artist: 'Mer Watson', artistId: 'a_mer', status: 'published', plays: 1000, createdAt: cu },
    { id: 's_mer2', title: 'Sunday Morning', artist: 'Mer Watson', artistId: 'a_mer', status: 'published', plays: 0, createdAt: cu },
  ]);
});
afterAll(dongDb);

const mer = () => dangNhap('mer@example.com');
const nghe = (id, token, body = {}) => {
  const r = api().post(`/api/songs/${id}/play`);
  return (token ? r.set(auth(token)) : r).send(body);
};
// Tạo sẵn lượt nghe trong quá khứ (ghi thẳng CSDL để chọn được thời điểm)
const taoLuotNghe = (ds) =>
  PlayEvent.insertMany(ds.map(([songId, listenerKey, source, createdAt]) => ({ songId, artistId: 'a_mer', listenerKey, source, createdAt })));
const stats = async (query = '') => api().get(`/api/studio/stats?tz=${TZ}${query}`).set(auth(await mer()));

describe('Ghi lượt nghe – chống tăng ảo', () => {
  test('IT116: nghe 1 bài → tính 1 lượt kèm nguồn; nghe lại ngay → không tính; sau 10 phút → tính lại', async () => {
    const jason = await dangNhap('jason@example.com');
    const lan1 = await nghe('s_mer1', jason, { source: 'search' });
    const lan2 = await nghe('s_mer1', jason, { source: 'search' });
    // Giả lập lượt nghe đầu đã qua 11 phút
    await PlayEvent.updateMany({ songId: 's_mer1' }, { createdAt: new Date(Date.now() - 11 * 60 * 1000) });
    const lan3 = await nghe('s_mer1', jason, { source: 'feed' });
    const song = await Song.findOne({ id: 's_mer1' });
    const events = await PlayEvent.find({ songId: 's_mer1' }).sort({ createdAt: 1 }).lean();
    ghiKetQua('IT116', `Lần 1: counted = ${lan1.body.counted}; lần 2 (ngay sau): counted = ${lan2.body.counted} (${lan2.body.reason}); lần 3 (sau 11 phút): counted = ${lan3.body.counted}; plays 1000 → ${song.plays}; sự kiện: ${events.map((e) => `${e.listenerKey}/${e.source}`).join(', ')}`);

    expect([lan1.status, lan2.status, lan3.status]).toEqual([200, 200, 200]);
    expect([lan1.body.counted, lan2.body.counted, lan3.body.counted]).toEqual([true, false, true]);
    expect(lan2.body.reason).toBe('duplicate');
    expect(song.plays).toBe(1002);
    expect(events.map((e) => [e.listenerKey, e.source, e.artistId])).toEqual([['u:u_jason', 'search', 'a_mer'], ['u:u_jason', 'feed', 'a_mer']]);
  });

  test('IT117: khách tính theo IP (2 lần → 1 lượt); nghệ sĩ nghe bài của mình → không tính; nguồn lạ → "other"', async () => {
    const khach1 = await nghe('s_mer1', null, { source: '<script>' });
    const khach2 = await nghe('s_mer1');
    const chinhMinh = await nghe('s_mer1', await mer(), { source: 'artist' });
    const song = await Song.findOne({ id: 's_mer1' });
    const ev = await PlayEvent.find({ songId: 's_mer1' }).lean();
    ghiKetQua('IT117', `Khách lần 1: ${khach1.body.counted}, lần 2: ${khach2.body.counted}; nghệ sĩ tự nghe: ${chinhMinh.body.counted} (${chinhMinh.body.reason}); plays = ${song.plays}; ${ev.length} sự kiện, người nghe "${ev[0].listenerKey.slice(0, 3)}…", nguồn "${ev[0].source}"`);

    expect([khach1.body.counted, khach2.body.counted, chinhMinh.body.counted]).toEqual([true, false, false]);
    expect(chinhMinh.body.reason).toBe('own_song');
    expect(song.plays).toBe(1001);
    expect(ev).toHaveLength(1);
    expect(ev[0].listenerKey).toMatch(/^ip:[0-9a-f]{16}$/);
    expect(ev[0].source).toBe('other');
  });

  test('IT118: quá 60 yêu cầu / phút từ một IP → 429, lượt nghe không tăng thêm', async () => {
    const ketQua = [];
    for (let i = 0; i < 61; i++) ketQua.push((await nghe('s_mer2')).status);
    const song = await Song.findOne({ id: 's_mer2' });
    ghiKetQua('IT118', `60 yêu cầu đầu: ${ketQua.slice(0, 60).every((s) => s === 200) ? 'đều 200' : 'có lỗi'}; yêu cầu 61: ${ketQua[60]}; plays = ${song.plays}`);
    expect(ketQua.slice(0, 60).every((s) => s === 200)).toBe(true);
    expect(ketQua[60]).toBe(429);
    expect(song.plays).toBe(1);
  });
});

describe('Thống kê của nghệ sĩ', () => {
  test('IT119: 7 ngày – lượt nghe, người nghe, % so với 7 ngày trước, biểu đồ theo ngày, top bài, nguồn', async () => {
    const now = new Date();
    const homQua = new Date(startOfDay(now, TZ).getTime() - 12 * 60 * 60 * 1000);
    const tuanTruoc = new Date(startOfDay(now, TZ).getTime() - 8 * DAY_MS);
    await taoLuotNghe([
      ['s_mer1', 'u:a', 'search', now], ['s_mer1', 'u:b', 'search', now], ['s_mer2', 'u:a', 'feed', now],
      ['s_mer1', 'u:c', 'search', homQua], ['s_mer2', 'u:c', 'feed', homQua],
      // 7 ngày trước đó: 4 lượt, 2 người nghe
      ['s_mer1', 'u:a', 'home', tuanTruoc], ['s_mer1', 'u:b', 'home', tuanTruoc], ['s_mer2', 'u:a', 'home', tuanTruoc], ['s_mer2', 'u:b', 'home', tuanTruoc],
    ]);
    const res = await stats('&range=7');
    const d = res.body.data;
    ghiKetQua('IT119', `${res.status}; Plays ${d.tiles.plays.value} (${d.tiles.plays.change}%); Listeners ${d.tiles.listeners.value} (${d.tiles.listeners.change}%); biểu đồ ${d.series.length} ngày, 2 ngày cuối: ${d.series.slice(-2).map((p) => p.plays).join(', ')}; top: ${d.topSongs.map((s) => `${s.title} ${s.plays} (${s.change}%)`).join(' | ')}; nguồn: ${d.sources.map((s) => `${s.source} ${s.percent}%`).join(', ')}`);

    expect(res.status).toBe(200);
    expect(d.tiles.plays).toEqual({ value: 5, change: 25 });
    expect(d.tiles.listeners).toEqual({ value: 3, change: 50 });
    expect(d.seriesUnit).toBe('day');
    expect(d.series).toHaveLength(7);
    expect(d.series[6]).toMatchObject({ key: dayKey(now, TZ), plays: 3 });
    expect(d.series[5].plays).toBe(2);
    expect(d.topSongs.map((s) => [s.id, s.plays, s.change])).toEqual([['s_mer1', 3, 50], ['s_mer2', 2, 0]]);
    expect(d.sources).toEqual([{ source: 'search', plays: 3, percent: 60 }, { source: 'feed', plays: 2, percent: 40 }]);
    expect(d.hasPlays).toBe(true);
  });

  test('IT120: theo dõi / bỏ theo dõi, thích bài, thêm vào playlist qua API thật → hiện đúng trong thống kê', async () => {
    const jason = await dangNhap('jason@example.com');
    const ashley = await dangNhap('ashley@example.com');
    await api().post('/api/auth/follow-artist').set(auth(jason)).send({ artistId: 'a_mer' });
    await api().post('/api/auth/follow-artist').set(auth(ashley)).send({ artistId: 'a_mer' });
    await api().post('/api/auth/follow-artist').set(auth(ashley)).send({ artistId: 'a_mer' }); // bỏ theo dõi
    await api().post('/api/auth/like-song').set(auth(jason)).send({ songId: 's_mer1' });
    await api().post('/api/auth/like-song').set(auth(ashley)).send({ songId: 's_mer1' });
    await api().post('/api/auth/like-song').set(auth(ashley)).send({ songId: 's_mer1' }); // bỏ thích
    const them = await api().post('/api/playlists/add-song').set(auth(jason)).send({ playlistId: 'p_jason', songId: 's_mer1' });
    const d = (await stats('&range=7')).body.data;
    const bai = (await api().get(`/api/studio/stats/songs/s_mer1?tz=${TZ}`).set(auth(await mer()))).body.data;
    ghiKetQua('IT120', `Thêm vào playlist: ${them.status}; New followers ${d.tiles.newFollowers.value} (theo dõi ${d.followers.followed}, bỏ ${d.followers.unfollowed}), tổng ${d.followers.total}; Song likes ${d.tiles.songLikes.value}; bài s_mer1: Liked by ${bai.tiles.likes.value}, Added to playlists ${bai.tiles.playlistAdds.value}`);

    expect(them.status).toBe(200);
    expect(d.tiles.newFollowers.value).toBe(1);
    expect(d.followers).toEqual({ total: 6, followed: 2, unfollowed: 1, net: 1 });
    expect(d.tiles.songLikes.value).toBe(1);
    expect(bai.tiles.likes.value).toBe(1);
    expect(bai.tiles.playlistAdds.value).toBe(1);
  });

  test('IT121: 30 ngày có 30 cột; All time – tổng gồm lượt nghe cũ, biểu đồ 12 tháng, cột "Before", nguồn "unknown"', async () => {
    const now = new Date();
    await taoLuotNghe([
      ['s_mer1', 'u:a', 'search', now], ['s_mer1', 'u:b', 'feed', now],
      ['s_mer1', 'u:a', 'search', new Date(now.getTime() - 20 * DAY_MS)],
    ]);
    const d30 = (await stats('&range=30')).body.data;
    const all = (await stats('&range=all')).body.data;
    ghiKetQua('IT121', `30 ngày: ${d30.series.length} cột, Plays ${d30.tiles.plays.value}; All time: Total plays ${all.tiles.plays.value}, Listeners ${all.tiles.listeners.value}, ${all.series.length} tháng (đơn vị ${all.seriesUnit}), Before = ${all.before}; nguồn: ${all.sources.map((s) => `${s.source} ${s.plays}`).join(', ')}; top: ${all.topSongs.map((s) => `${s.title} ${s.plays}`).join(' | ')}`);

    expect(d30.series).toHaveLength(30);
    expect(d30.tiles.plays.value).toBe(3);
    expect(all.tiles.plays.value).toBe(1000);
    expect(all.tiles.listeners.value).toBe(2);
    expect(all.tiles.plays.change).toBeUndefined();
    expect(all.seriesUnit).toBe('month');
    expect(all.series).toHaveLength(12);
    expect(all.series.reduce((s, m) => s + m.plays, 0)).toBe(3);
    expect(all.before).toBe(997);
    expect(all.sources[0]).toEqual({ source: 'unknown', plays: 997, percent: 100 });
    expect(all.sources.map((s) => s.source)).toEqual(['unknown', 'search', 'feed']);
    expect(all.topSongs.map((s) => s.id)).toEqual(['s_mer1']);
  });

  test('IT122: thống kê một bài; bài của nghệ sĩ khác → 404; người nghe → 403; khách → 401; range lạ → 7 ngày', async () => {
    await taoLuotNghe([['s_mer1', 'u:a', 'album', new Date()], ['s_mer2', 'u:a', 'feed', new Date()]]);
    const token = await mer();
    const cuaToi = await api().get(`/api/studio/stats/songs/s_mer1?tz=${TZ}&range=xyz`).set(auth(token));
    const cuaNguoiKhac = await api().get('/api/studio/stats/songs/s1').set(auth(token));
    const nguoiNghe = await api().get('/api/studio/stats').set(auth(await dangNhap('jason@example.com')));
    const khach = await api().get('/api/studio/stats');
    const d = cuaToi.body.data;
    ghiKetQua('IT122', `Bài của tôi: ${cuaToi.status}, range = ${d.range}, Plays ${d.tiles.plays.value}, All-time ${d.allTimePlays}, nguồn ${d.sources.map((s) => s.source).join(',')}; bài The Weeknd: ${cuaNguoiKhac.status}; người nghe: ${nguoiNghe.status}; khách: ${khach.status}`);

    expect(cuaToi.status).toBe(200);
    expect(d.range).toBe('7');
    expect(d.song).toMatchObject({ id: 's_mer1', title: 'Mùa thu Hà Nội' });
    expect(d.tiles.plays.value).toBe(1);
    expect(d.allTimePlays).toBe(1000);
    expect(d.sources).toEqual([{ source: 'album', plays: 1, percent: 100 }]);
    expect([cuaNguoiKhac.status, nguoiNghe.status, khach.status]).toEqual([404, 403, 401]);
  });

  test('IT123: trang chính Studio có tóm tắt tuần; phần Feed đếm thích / bình luận / chia sẻ của bài đăng trong kỳ', async () => {
    const now = new Date();
    await taoLuotNghe([['s_mer1', 'u:a', 'search', now], ['s_mer1', 'u:b', 'search', now]]);
    await ActivityEvent.create({ type: 'follow', artistId: 'a_mer', userId: 'u_x' });
    const token = await mer();
    const post = await api().post('/api/feed/posts').set(auth(token)).send({ content: 'Hello fans' });
    const jason = await dangNhap('jason@example.com');
    await api().post('/api/feed/comments').set(auth(jason)).send({ postId: post.body.data.id, text: 'Hi!' });
    await FeedPost.updateOne({ id: post.body.data.id }, { likes: 4, shares: 2 });
    // Bài đăng cũ (ngoài 7 ngày) không được tính vào kỳ này
    await FeedPost.create({ id: 'fp_old', authorArtistId: 'a_mer', authorName: 'Mer Watson', content: 'Old', likes: 50, createdAt: new Date(now.getTime() - 40 * DAY_MS) });
    const tongQuan = (await api().get(`/api/studio/overview?tz=${TZ}`).set(auth(token))).body.data;
    const d = (await stats('&range=7')).body.data;
    const all = (await stats('&range=all')).body.data;
    ghiKetQua('IT123', `Overview.week = ${JSON.stringify(tongQuan.week)}; Feed 7 ngày = ${JSON.stringify(d.feed)}; Feed all time = ${JSON.stringify(all.feed)}`);

    expect(tongQuan.week).toEqual({ plays: 2, playsChange: null, newFollowers: 1 });
    expect(d.feed).toEqual({ posts: 1, likes: 4, comments: 1, shares: 2 });
    expect(all.feed).toMatchObject({ posts: 2, likes: 54 });
  });

  test('IT124: ngày ra bài mới được đánh dấu trên biểu đồ; nghệ sĩ chưa có lượt nghe → hasPlays = false, đủ cột 0', async () => {
    const token = await mer();
    const tai = await api().post('/api/studio/songs').set(auth(token)).field('title', 'Late Night Coffee').field('genre', 'Pop')
      .attach('audio', Buffer.from('ID3 fake'), { filename: 'a.mp3', contentType: 'audio/mpeg' });
    const d = (await stats('&range=7')).body.data;
    const homNay = d.series[6];
    ghiKetQua('IT124', `Tải bài: ${tai.status}; cột hôm nay: plays = ${homNay.plays}, releases = [${homNay.releases.join(', ')}]; hasPlays = ${d.hasPlays}; Plays ${d.tiles.plays.value} (${d.tiles.plays.change}%)`);

    expect(tai.status).toBe(201);
    expect(homNay.releases).toEqual(['Late Night Coffee']);
    expect(d.series.slice(0, 6).every((p) => p.releases.length === 0)).toBe(true);
    expect(d.hasPlays).toBe(false);
    expect(d.tiles.plays).toEqual({ value: 0, change: 0 });
    expect(d.series.every((p) => p.plays === 0)).toBe(true);
  });

  test('IT125: dữ liệu demo của lệnh seed – 90 ngày, có cột nhảy vọt ngày ra bài mới, không có sự kiện ở tương lai', async () => {
    const { buildDemoStats } = require('../../src/seed/demoStats');
    const now = new Date();
    const demo = buildDemoStats({ artistId: 'a_mer', songs: [{ id: 's_mer1', weight: 5 }], newSong: { id: 's_mer2', daysAgo: 10 }, userIds: ['u_jason'], now });
    await PlayEvent.insertMany(demo.playEvents);
    await ActivityEvent.insertMany(demo.activityEvents);
    // Bài mới ra cách đây 10 ngày (seed đặt createdAt trong quá khứ)
    const raMat = new Date(now.getTime() - 10 * DAY_MS);
    await Song.updateOne({ id: 's_mer2' }, { createdAt: raMat, followersNotifiedAt: raMat, plays: demo.playsBySong.s_mer2 });
    const d = (await stats('&range=30')).body.data;
    const dinh = d.series.reduce((a, b) => (b.plays > a.plays ? b : a));
    const lap = buildDemoStats({ artistId: 'a_mer', songs: [{ id: 's_mer1', weight: 5 }], newSong: { id: 's_mer2', daysAgo: 10 }, userIds: ['u_jason'], now });
    ghiKetQua('IT125', `${demo.playEvents.length} lượt nghe, ${demo.activityEvents.length} tương tác; 30 ngày: Plays ${d.tiles.plays.value} (${d.tiles.plays.change}%), Listeners ${d.tiles.listeners.value}; cột cao nhất ${dinh.key} = ${dinh.plays} lượt, ra bài: [${dinh.releases.join(', ')}]; sự kiện ở tương lai: ${demo.playEvents.filter((e) => e.createdAt > now).length}; chạy lại cho cùng số lượng: ${lap.playEvents.length === demo.playEvents.length}`);

    expect(demo.playEvents.length).toBeGreaterThan(3000);
    expect(demo.playEvents.every((e) => e.createdAt <= now && e.createdAt > new Date(now.getTime() - 91 * DAY_MS))).toBe(true);
    expect(lap.playEvents.length).toBe(demo.playEvents.length);
    expect(d.tiles.plays.value).toBeGreaterThan(d.series.length * 30);
    expect(d.tiles.plays.change).toBeGreaterThan(0);
    // Cột cao nhất là ngày ra bài mới (hoặc ngay sau đó nếu rơi vào cuối tuần)
    expect(d.series.findIndex((p) => p.releases.includes('Sunday Morning'))).toBeGreaterThanOrEqual(0);
    expect(Math.abs(d.series.indexOf(dinh) - d.series.findIndex((p) => p.releases.length))).toBeLessThanOrEqual(2);
    expect(d.sources.length).toBeGreaterThanOrEqual(5);
  });
});
