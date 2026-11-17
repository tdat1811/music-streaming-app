// Kiểm thử tích hợp: khu Admin riêng – Dashboard và lịch sử duyệt (IT98–IT100)
const { api, auth, dangNhap, ghiKetQua } = require('../helpers/api');
const { moDb, lamMoiDuLieu, dongDb } = require('../helpers/db');
const User = require('../../src/models/User');
const Artist = require('../../src/models/Artist');

beforeAll(moDb);
beforeEach(lamMoiDuLieu);
afterAll(dongDb);

const FORM = { genres: ['Pop'], bio: 'Singer from Hà Nội writing honest songs about life.', socialLinks: [], agree: true };
const guiYeuCau = async (email, stageName) =>
  (await api().post('/api/artist-requests').set(auth(await dangNhap(email))).send({ ...FORM, stageName })).body.data.id;

describe('Khu Admin', () => {
  test('IT98: Dashboard – số liệu "this week" chỉ đếm bản ghi trong 7 ngày; yêu cầu chờ cũ nhất trước', async () => {
    const cu = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // Đẩy 2 nghệ sĩ và 1 người dùng về 30 ngày trước (ghi thẳng collection để giữ createdAt cũ)
    await Artist.collection.updateMany({ id: { $in: ['a_weeknd', 'a_sontung'] } }, { $set: { createdAt: cu } });
    await User.collection.updateOne({ id: 'u_kevin' }, { $set: { createdAt: cu } });
    const id1 = await guiYeuCau('ashley@example.com', 'Ashley S.');
    await guiYeuCau('jason@example.com', 'Jason Beats');
    const res = await api().get('/api/admin/summary').set(auth(await dangNhap('admin@example.com')));
    const d = res.body.data;
    ghiKetQua('IT98', `${res.status}; artists ${d.artists} (tuần này ${d.thisWeek.artists}); users ${d.users} (tuần này ${d.thisWeek.users}); pending ${d.pendingRequests}, preview: [${d.pendingPreview.map((r) => r.stageName).join(', ')}]`);

    expect(res.status).toBe(200);
    expect(d.thisWeek.artists).toBe(d.artists - 2);
    expect(d.thisWeek.users).toBe(d.users - 1);
    expect(d.pendingPreview.map((r) => r.id)[0]).toBe(id1);
    expect(d.oldestPendingAt).toBeTruthy();
  });

  test('IT99: hoạt động gần đây có tên admin đã xử lý; my-reviews chỉ gồm yêu cầu do chính admin đó xử lý', async () => {
    await User.create({ id: 'u_admin2', name: 'Second Admin', email: 'admin2@example.com', password: (await User.findOne({ id: 'u_admin' })).password, role: 'admin' });
    const id1 = await guiYeuCau('ashley@example.com', 'Ashley S.');
    const id2 = await guiYeuCau('jason@example.com', 'Jason Beats');
    const a1 = await dangNhap('admin@example.com');
    const a2 = await dangNhap('admin2@example.com');
    await api().post(`/api/admin/artist-requests/${id1}/approve`).set(auth(a1)).send({});
    await api().post(`/api/admin/artist-requests/${id2}/reject`).set(auth(a2)).send({ reason: 'incomplete_info' });
    const tom = await api().get('/api/admin/summary').set(auth(a1));
    const cuaToi = await api().get('/api/admin/my-reviews').set(auth(a1));
    const ganDay = tom.body.data.recentlyReviewed.map((r) => `${r.stageName}/${r.reviewerName}`);
    ghiKetQua('IT99', `Gần đây: [${ganDay.join(', ')}]; my-reviews của admin 1: ${cuaToi.body.counts.approved} duyệt, ${cuaToi.body.counts.rejected} từ chối, [${cuaToi.body.data.map((r) => r.stageName).join(', ')}]`);

    expect(ganDay.sort()).toEqual(['Ashley S./Admin Team', 'Jason Beats/Second Admin']);
    expect(cuaToi.body.counts).toEqual({ approved: 1, rejected: 0 });
    expect(cuaToi.body.data.map((r) => r.id)).toEqual([id1]);
  });

  test('IT100: listener / artist gọi summary và my-reviews → 403', async () => {
    const listener = await dangNhap('ashley@example.com');
    const artist = await dangNhap('mer@example.com');
    const r = await Promise.all([
      api().get('/api/admin/my-reviews').set(auth(listener)),
      api().get('/api/admin/my-reviews').set(auth(artist)),
      api().get('/api/admin/summary').set(auth(artist)),
    ]);
    ghiKetQua('IT100', `listener my-reviews: ${r[0].status}; artist my-reviews: ${r[1].status}; artist summary: ${r[2].status}`);
    expect(r.map((x) => x.status)).toEqual([403, 403, 403]);
  });
});
