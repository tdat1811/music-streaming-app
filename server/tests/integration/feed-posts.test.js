// Kiểm thử tích hợp: giai đoạn 3 – nghệ sĩ đăng bài, thông báo người theo dõi, tab Following, nhãn Artist (IT101–IT110)
const fs = require('fs');
const os = require('os');
const path = require('path');
const UPLOAD_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'music-feed-test-'));
process.env.UPLOAD_ROOT = UPLOAD_ROOT;

const { api, auth, dangNhap, ghiKetQua } = require('../helpers/api');
const { moDb, lamMoiDuLieu, dongDb } = require('../helpers/db');
const User = require('../../src/models/User');
const Song = require('../../src/models/Song');
const FeedPost = require('../../src/models/FeedPost');
const Comment = require('../../src/models/Comment');
const Notification = require('../../src/models/Notification');

beforeAll(moDb);
beforeEach(async () => {
  await lamMoiDuLieu();
  // Bài đã đăng của Mer để gắn vào bài viết; Jason theo dõi Mer, Ashley thì không
  await Song.create({ id: 's_mer1', title: 'Mùa thu Hà Nội', artist: 'Mer Watson', artistId: 'a_mer', status: 'published', plays: 0 });
  await User.updateOne({ id: 'u_jason' }, { followedArtistIds: ['a_mer'] });
});
afterAll(async () => {
  await dongDb();
  fs.rmSync(UPLOAD_ROOT, { recursive: true, force: true });
});

const mer = () => dangNhap('mer@example.com');
const dang = async (token, body) => api().post('/api/feed/posts').set(auth(token)).send(body);

describe('Nghệ sĩ đăng bài', () => {
  test('IT101: đăng bài chữ + bài hát → 201, hiện đầu Feed, người theo dõi nhận thông báo, người không theo dõi thì không', async () => {
    const res = await dang(await mer(), { content: 'So excited to share this!', songId: 's_mer1' });
    const feed = await api().get('/api/feed/posts');
    const tbJason = await Notification.findOne({ userId: 'u_jason', type: 'artist_new_post' });
    const tbAshley = await Notification.findOne({ userId: 'u_ashley', type: 'artist_new_post' });
    ghiKetQua('IT101', `${res.status}; bài đầu Feed: "${feed.body.data[0]?.content}" của ${feed.body.data[0]?.authorName}; thông báo Jason (theo dõi): ${tbJason ? 'có' : 'không'}; Ashley (không theo dõi): ${tbAshley ? 'có' : 'không'}`);

    expect(res.status).toBe(201);
    expect(feed.body.data[0]).toMatchObject({ id: res.body.data.id, authorName: 'Mer Watson', songId: 's_mer1' });
    expect(tbJason).toMatchObject({ postId: res.body.data.id, artistId: 'a_mer', actorName: 'Mer Watson' });
    expect(tbAshley).toBeNull();
  });

  test('IT102: bài chỉ có chữ / chỉ có bài hát → được; trống cả hai → 400; quá 1000 ký tự → 400', async () => {
    const token = await mer();
    const chu = await dang(token, { content: 'Thank you all!' });
    const bai = await dang(token, { songId: 's_mer1' });
    const trong = await dang(token, { content: '  ' });
    const dai = await dang(token, { content: 'x'.repeat(1001) });
    ghiKetQua('IT102', `Chỉ chữ: ${chu.status}; chỉ bài hát: ${bai.status}; trống: ${trong.status}; 1001 ký tự: ${dai.status}`);
    expect([chu.status, bai.status, trong.status, dai.status]).toEqual([201, 201, 400, 400]);
  });

  test('IT103: gắn bài hát của nghệ sĩ khác / bài nháp → 400; listener đăng bài → 403', async () => {
    const token = await mer();
    const khac = await dang(token, { content: 'Hi', songId: 's1' });
    const nhap = await dang(token, { content: 'Hi', songId: 's_draft' });
    const listener = await dang(await dangNhap('ashley@example.com'), { content: 'Hi' });
    ghiKetQua('IT103', `Bài của The Weeknd: ${khac.status}; bài nháp: ${nhap.status}; listener: ${listener.status}`);
    expect([khac.status, nhap.status, listener.status]).toEqual([400, 400, 403]);
  });

  test('IT104: giới hạn 10 bài / 24 giờ → bài thứ 11 bị 429', async () => {
    const token = await mer();
    for (let i = 0; i < 10; i++) await dang(token, { content: `Post ${i + 1}` });
    const thu11 = await dang(token, { content: 'Post 11' });
    ghiKetQua('IT104', `Bài thứ 11: ${thu11.status} ${thu11.body.code}; số bài trong CSDL: ${await FeedPost.countDocuments({ authorArtistId: 'a_mer' })}`);
    expect(thu11.status).toBe(429);
    expect(await FeedPost.countDocuments({ authorArtistId: 'a_mer' })).toBe(10);
  });

  test('IT105: sửa bài → có editedAt; nghệ sĩ khác sửa / xoá → 404', async () => {
    const token = await mer();
    const id = (await dang(token, { content: 'Typo' })).body.data.id;
    const sua = await api().put(`/api/feed/posts/${id}`).set(auth(token)).send({ content: 'Fixed', songId: 's_mer1' });
    // Lan thành nghệ sĩ có trang riêng
    const Artist = require('../../src/models/Artist');
    await Artist.create({ id: 'a_lan', name: 'Lan Band', ownerUserId: 'u_lan' });
    await User.updateOne({ id: 'u_lan' }, { artistId: 'a_lan' });
    const lan = await dangNhap('lan@example.com');
    const suaTrom = await api().put(`/api/feed/posts/${id}`).set(auth(lan)).send({ content: 'Hacked' });
    const xoaTrom = await api().delete(`/api/feed/posts/${id}`).set(auth(lan));
    const db = await FeedPost.findOne({ id });
    ghiKetQua('IT105', `Sửa: ${sua.status}, nội dung "${db.content}", editedAt ${db.editedAt ? 'có' : 'không'}; nghệ sĩ khác sửa: ${suaTrom.status}, xoá: ${xoaTrom.status}`);
    expect(sua.status).toBe(200);
    expect(db.content).toBe('Fixed');
    expect(db.editedAt).toBeTruthy();
    expect([suaTrom.status, xoaTrom.status]).toEqual([404, 404]);
  });

  test('IT106: xoá bài → xoá cả bình luận và thông báo của bài đó', async () => {
    const token = await mer();
    const id = (await dang(token, { content: 'Bye' })).body.data.id;
    await api().post('/api/feed/comments').set(auth(await dangNhap('jason@example.com'))).send({ postId: id, text: 'Nice!' });
    const truoc = await Comment.countDocuments({ postId: id });
    const xoa = await api().delete(`/api/feed/posts/${id}`).set(auth(token));
    const sau = await Comment.countDocuments({ postId: id });
    const tb = await Notification.countDocuments({ postId: id });
    ghiKetQua('IT106', `Xoá: ${xoa.status}, deletedComments = ${xoa.body.deletedComments}; bình luận ${truoc} → ${sau}; thông báo còn lại: ${tb}`);
    expect(xoa.status).toBe(200);
    expect([truoc, sau, tb]).toEqual([1, 0, 0]);
  });
});

describe('Feed của người nghe', () => {
  test('IT107: scope=following chỉ có bài của nghệ sĩ đang theo dõi; khách gọi → 401; artistId lọc đúng', async () => {
    await dang(await mer(), { content: 'From Mer' });
    const jason = await api().get('/api/feed/posts?scope=following').set(auth(await dangNhap('jason@example.com')));
    const ashley = await api().get('/api/feed/posts?scope=following').set(auth(await dangNhap('ashley@example.com')));
    const khach = await api().get('/api/feed/posts?scope=following');
    const theoNgheSi = await api().get('/api/feed/posts?artistId=a_weeknd');
    ghiKetQua('IT107', `Jason (theo dõi Mer): [${jason.body.data.map((p) => p.authorName).join(', ')}]; Ashley: ${ashley.body.count} bài; khách: ${khach.status}; artistId=a_weeknd: [${theoNgheSi.body.data.map((p) => p.id).join(', ')}]`);
    expect(jason.body.data.map((p) => p.authorName)).toEqual(['Mer Watson']);
    expect(ashley.body.count).toBe(0);
    expect(khach.status).toBe(401);
    expect(theoNgheSi.body.data.map((p) => p.id)).toEqual(['fp2']);
  });

  test('IT108: bình luận của chính nghệ sĩ dưới bài của họ có isArtist = true (cả trả lời)', async () => {
    const token = await mer();
    const id = (await dang(token, { content: 'Ask me anything' })).body.data.id;
    const jason = await dangNhap('jason@example.com');
    const c = await api().post('/api/feed/comments').set(auth(jason)).send({ postId: id, text: 'Acoustic version?' });
    const gui = await api().post('/api/feed/comments').set(auth(token)).send({ postId: id, text: 'Yes!', replyTarget: { rootCommentId: c.body.data.id, userName: 'Jason Smith' } });
    const ds = await api().get(`/api/feed/comments/${id}`);
    const goc = ds.body.data[0];
    ghiKetQua('IT108', `Bình luận Jason: isArtist = ${goc.isArtist}; trả lời của Mer: isArtist = ${goc.replies[0]?.isArtist}`);
    expect(goc.isArtist).toBe(false);
    expect(goc.replies[0].isArtist).toBe(true);
    // Phản hồi ngay lúc gửi cũng có nhãn (app hiện luôn, không cần tải lại)
    expect(gui.body.data.replies[0].isArtist).toBe(true);
  });
});

describe('Bài hát mới', () => {
  const taiBai = (token, extra = {}) => {
    let r = api().post('/api/studio/songs').set(auth(token)).field('title', 'Sunday Morning').field('genre', 'Pop');
    Object.entries(extra).forEach(([k, v]) => { r = r.field(k, v); });
    return r.attach('audio', Buffer.from('ID3 fake'), { filename: 'a.mp3', contentType: 'audio/mpeg' });
  };

  test('IT109: đăng bài hát → người theo dõi nhận "bài hát mới" 1 lần; ẩn rồi hiện lại không báo lại', async () => {
    const token = await mer();
    const id = (await taiBai(token)).body.data.id;
    await api().patch(`/api/studio/songs/${id}/status`).set(auth(token)).send({ status: 'hidden' });
    await api().patch(`/api/studio/songs/${id}/status`).set(auth(token)).send({ status: 'published' });
    const so = await Notification.countDocuments({ userId: 'u_jason', type: 'artist_new_song', songId: id });
    ghiKetQua('IT109', `Số thông báo "bài hát mới" Jason nhận: ${so}`);
    expect(so).toBe(1);
  });

  test('IT110: bài nháp không báo; đăng nháp thành công khai thì báo; shareToFeed tạo bài kèm bài hát (không báo thêm "posted")', async () => {
    const token = await mer();
    const nhap = (await taiBai(token, { status: 'draft' })).body.data.id;
    const truoc = await Notification.countDocuments({ type: 'artist_new_song', songId: nhap });
    await api().patch(`/api/studio/songs/${nhap}/status`).set(auth(token)).send({ status: 'published' });
    const sau = await Notification.countDocuments({ type: 'artist_new_song', songId: nhap });
    const share = await taiBai(token, { shareToFeed: 'true' });
    const post = await FeedPost.findOne({ id: share.body.sharedPostId });
    const tbPost = await Notification.countDocuments({ type: 'artist_new_post', userId: 'u_jason' });
    ghiKetQua('IT110', `Nháp: ${truoc} thông báo → sau khi đăng: ${sau}; shareToFeed: bài "${post?.content}" kèm ${post?.songId}; thông báo "posted": ${tbPost}`);
    expect([truoc, sau]).toEqual([0, 1]);
    expect(post).toMatchObject({ songId: share.body.data.id, authorArtistId: 'a_mer' });
    expect(tbPost).toBe(0);
  });
});
