// Kiểm thử tích hợp: Bảng tin và thông báo (IT27–IT32)
const { api, auth, dangNhap, ghiKetQua } = require('../helpers/api');
const { moDb, lamMoiDuLieu, dongDb } = require('../helpers/db');
const FeedPost = require('../../src/models/FeedPost');
const Comment = require('../../src/models/Comment');
const Notification = require('../../src/models/Notification');

beforeAll(moDb);
beforeEach(lamMoiDuLieu);
afterAll(dongDb);

const binhLuan = (token, body) => api().post('/api/feed/comments').set(auth(token)).send({ postId: 'fp1', ...body });
const traLoi = (token, commentId, userName, text) =>
  binhLuan(token, { text, replyTarget: { rootCommentId: commentId, commentId, userName } });

describe('Bảng tin và thông báo', () => {
  test('IT27: thích bài đăng 2 lần → 21 rồi về 20 lượt thích', async () => {
    const token = await dangNhap('ashley@example.com');
    const lan1 = await api().post('/api/feed/posts/like').set(auth(token)).send({ postId: 'fp1' });
    const lan2 = await api().post('/api/feed/posts/like').set(auth(token)).send({ postId: 'fp1' });
    const post = await FeedPost.findOne({ id: 'fp1' });
    ghiKetQua('IT27', `Lần 1: ${lan1.status}, likes = ${lan1.body.likes}, isLiked = ${lan1.body.isLiked}; Lần 2: likes = ${lan2.body.likes}, isLiked = ${lan2.body.isLiked}; CSDL likedByUserIds: [${post.likedByUserIds.join(', ')}]`);

    expect(lan1.body).toMatchObject({ likes: 21, isLiked: true });
    expect(lan2.body).toMatchObject({ likes: 20, isLiked: false });
    expect(post.likedByUserIds).not.toContain('u_ashley');
  });

  test('IT28: bình luận chỉ có khoảng trắng → 400, không tạo bình luận', async () => {
    const token = await dangNhap('ashley@example.com');
    const res = await binhLuan(token, { text: '   ' });
    const so = await Comment.countDocuments({ postId: 'fp1' });
    ghiKetQua('IT28', `${res.status} "${res.body.message}"; số bình luận gốc của fp1: ${so}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Nội dung bình luận không được rỗng.');
    expect(so).toBe(2);
  });

  test('IT29: gửi kèm tên giả "Hacker" → tên lưu là tên thật của tài khoản', async () => {
    const token = await dangNhap('ashley@example.com');
    const res = await binhLuan(token, { text: 'Hay quá', userName: 'Hacker' });
    const saved = await Comment.findOne({ id: res.body.data?.id });
    ghiKetQua('IT29', `${res.status}; data.userName = "${res.body.data?.userName}"; CSDL userId = ${saved?.userId}`);

    expect(res.status).toBe(201);
    expect(res.body.data.userName).toBe('Ashley Scott');
    expect(saved.userId).toBe('u_ashley');
  });

  test('IT30: trả lời bình luận của người khác → tạo 1 thông báo cho tác giả', async () => {
    const token = await dangNhap('ashley@example.com');
    const res = await traLoi(token, 'c_jason', 'Jason Smith', 'Đồng ý');
    const reply = (res.body.data?.replies || []).find((r) => r.text === 'Đồng ý');
    const ds = await Notification.find({});
    const n = ds[0];
    ghiKetQua('IT30', `${res.status}; replyToName = "${reply?.replyToName}"; số thông báo: ${ds.length}${n ? `; userId = ${n.userId}, actorName = "${n.actorName}", targetCommentId = ${n.targetCommentId}, read = ${n.read}` : ''}`);

    expect(res.status).toBe(201);
    expect(reply.replyToName).toBe('Jason Smith');
    expect(ds).toHaveLength(1);
    expect(n).toMatchObject({ userId: 'u_jason', actorName: 'Ashley Scott', targetCommentId: 'c_jason', read: false });
  });

  test('IT31: tự trả lời bình luận của chính mình → không tạo thông báo', async () => {
    const token = await dangNhap('ashley@example.com');
    const res = await traLoi(token, 'c_ashley', 'Ashley Scott', 'Bổ sung thêm');
    const so = await Notification.countDocuments();
    ghiKetQua('IT31', `${res.status}; số thông báo: ${so}`);

    expect(res.status).toBe(201);
    expect(so).toBe(0);
  });

  test('IT32: xem, đọc 1, đọc tất cả thông báo; không đọc được thông báo của người khác', async () => {
    const tokenAshley = await dangNhap('ashley@example.com');
    await traLoi(tokenAshley, 'c_jason', 'Jason Smith', 'Đồng ý');
    const tokenJason = await dangNhap('jason@example.com');

    const ds = await api().get('/api/notifications').set(auth(tokenJason));
    const id = ds.body.data?.[0]?.id;
    const doc1 = await api().post(`/api/notifications/${id}/read`).set(auth(tokenJason));
    const docHet = await api().post('/api/notifications/read-all').set(auth(tokenJason));
    const nguoiKhac = await api().post(`/api/notifications/${id}/read`).set(auth(tokenAshley));
    const trongCsdl = await Notification.findOne({ id });
    ghiKetQua('IT32', `Danh sách: ${ds.status}, unreadCount = ${ds.body.unreadCount}; đọc 1: ${doc1.status}, read = ${doc1.body.data?.read}; đọc tất cả: ${docHet.status}; Ashley đọc thông báo của Jason: ${nguoiKhac.status}; CSDL read = ${trongCsdl?.read}`);

    expect(ds.status).toBe(200);
    expect(ds.body.unreadCount).toBe(1);
    expect(doc1.body.data.read).toBe(true);
    expect(docHet.status).toBe(200);
    expect(nguoiKhac.status).toBe(404);
    expect(trongCsdl.read).toBe(true);
  });
});
