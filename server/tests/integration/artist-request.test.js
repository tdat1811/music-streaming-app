// Kiểm thử tích hợp: đăng ký làm nghệ sĩ và Admin duyệt (IT58–IT72)
const fs = require('fs');
const os = require('os');
const path = require('path');
const UPLOAD_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'music-avatar-test-'));
process.env.UPLOAD_ROOT = UPLOAD_ROOT;

const { api, auth, dangNhap, ghiKetQua } = require('../helpers/api');
const { moDb, lamMoiDuLieu, dongDb } = require('../helpers/db');
const User = require('../../src/models/User');
const Artist = require('../../src/models/Artist');
const ArtistRequest = require('../../src/models/ArtistRequest');
const Notification = require('../../src/models/Notification');

beforeAll(moDb);
beforeEach(lamMoiDuLieu);
afterAll(async () => {
  await dongDb();
  fs.rmSync(UPLOAD_ROOT, { recursive: true, force: true });
});

const FORM = {
  stageName: 'Ashley S.',
  genres: ['Pop', 'Ballad'],
  bio: 'Singer from Hà Nội writing honest songs about growing up.',
  socialLinks: ['instagram.com/ashley.music'],
  agree: true,
};
const guiYeuCau = (token, thayDoi = {}) => api().post('/api/artist-requests').set(auth(token)).send({ ...FORM, ...thayDoi });
const admin = () => dangNhap('admin@example.com');

// Ashley gửi yêu cầu và trả về id
const taoYeuCauCuaAshley = async (thayDoi) => {
  const res = await guiYeuCau(await dangNhap('ashley@example.com'), thayDoi);
  return res.body.data.id;
};

describe('Người nghe gửi yêu cầu làm nghệ sĩ', () => {
  test('IT58: gửi hợp lệ → 201, CSDL có yêu cầu pending; GET /me trả về yêu cầu', async () => {
    const token = await dangNhap('ashley@example.com');
    const res = await guiYeuCau(token);
    const me = await api().get('/api/artist-requests/me').set(auth(token));
    const db = await ArtistRequest.findOne({ userId: 'u_ashley' });
    ghiKetQua('IT58', `${res.status}; CSDL status = ${db?.status}, stageName = ${db?.stageName}; GET /me: ${me.status}, status = ${me.body.data?.status}`);

    expect(res.status).toBe(201);
    expect(db.status).toBe('pending');
    expect(me.body.data.stageName).toBe('Ashley S.');
    expect(me.body.data.stageNameKey).toBeUndefined();
  });

  test('IT59: gửi lần 2 khi đang chờ → 409 PENDING_EXISTS; chưa từng gửi thì GET /me = null', async () => {
    const token = await dangNhap('ashley@example.com');
    const meTruoc = await api().get('/api/artist-requests/me').set(auth(token));
    await guiYeuCau(token);
    const lan2 = await guiYeuCau(token, { stageName: 'Tên khác' });
    const so = await ArtistRequest.countDocuments({ userId: 'u_ashley' });
    ghiKetQua('IT59', `GET /me trước khi gửi: data = ${meTruoc.body.data}; lần 2: ${lan2.status} ${lan2.body.code}; số yêu cầu: ${so}`);

    expect(meTruoc.body.data).toBeNull();
    expect(lan2.status).toBe(409);
    expect(lan2.body.code).toBe('PENDING_EXISTS');
    expect(so).toBe(1);
  });

  test('IT60: nghệ danh trùng trang có sẵn (khác hoa thường, dấu) hoặc trùng yêu cầu đang chờ → 409 NAME_TAKEN', async () => {
    const trungTrang = await guiYeuCau(await dangNhap('ashley@example.com'), { stageName: 'son tung m-tp' });
    await guiYeuCau(await dangNhap('ashley@example.com'), { stageName: 'Ashley S.' });
    const trungYeuCau = await guiYeuCau(await dangNhap('jason@example.com'), { stageName: 'ASHLEY s.' });
    ghiKetQua('IT60', `Trùng trang "Sơn Tùng M-TP": ${trungTrang.status} ${trungTrang.body.code}; trùng yêu cầu đang chờ: ${trungYeuCau.status} ${trungYeuCau.body.code}`);

    expect([trungTrang.status, trungYeuCau.status]).toEqual([409, 409]);
    expect(trungYeuCau.body.code).toBe('NAME_TAKEN');
  });

  test('IT61: form sai → 400 kèm lỗi từng trường; không token → 401; artist / admin gửi → 403', async () => {
    const token = await dangNhap('ashley@example.com');
    const sai = await guiYeuCau(token, { stageName: '', genres: [], agree: false });
    const khongToken = await api().post('/api/artist-requests').send(FORM);
    const artist = await guiYeuCau(await dangNhap('mer@example.com'), { stageName: 'Mer 2' });
    const quanTri = await guiYeuCau(await admin(), { stageName: 'Admin Band' });
    ghiKetQua('IT61', `Form sai: ${sai.status}, lỗi ở [${Object.keys(sai.body.errors || {}).join(', ')}]; không token: ${khongToken.status}; artist: ${artist.status}; admin: ${quanTri.status}`);

    expect(sai.status).toBe(400);
    expect(Object.keys(sai.body.errors).sort()).toEqual(['agree', 'genres', 'stageName']);
    expect([khongToken.status, artist.status, quanTri.status]).toEqual([401, 403, 403]);
    expect(await ArtistRequest.countDocuments()).toBe(0);
  });

  test('IT62: huỷ yêu cầu đang chờ → cancelled, gửi lại được; không có gì để huỷ → 404', async () => {
    const token = await dangNhap('ashley@example.com');
    await guiYeuCau(token);
    const huy = await api().delete('/api/artist-requests/me').set(auth(token));
    const huyLan2 = await api().delete('/api/artist-requests/me').set(auth(token));
    const guiLai = await guiYeuCau(token);
    ghiKetQua('IT62', `Huỷ: ${huy.status}, status = ${huy.body.data?.status}; huỷ lần 2: ${huyLan2.status}; gửi lại: ${guiLai.status}`);

    expect(huy.body.data.status).toBe('cancelled');
    expect(huyLan2.status).toBe(404);
    expect(guiLai.status).toBe(201);
  });

  test('IT63: tải ảnh đại diện png → 201 + đường dẫn /avatars/...; file .gif → 400', async () => {
    const token = await dangNhap('ashley@example.com');
    const ok = await api().post('/api/artist-requests/avatar').set(auth(token))
      .attach('avatar', Buffer.from('fake png'), { filename: 'me.png', contentType: 'image/png' });
    const sai = await api().post('/api/artist-requests/avatar').set(auth(token))
      .attach('avatar', Buffer.from('gif'), { filename: 'me.gif', contentType: 'image/gif' });
    const guiKemAnh = await guiYeuCau(token, { avatarImage: ok.body.avatarImage });
    ghiKetQua('IT63', `png: ${ok.status} ${ok.body.avatarImage}; gif: ${sai.status}; gửi kèm ảnh: ${guiKemAnh.status}`);

    expect(ok.status).toBe(201);
    expect(ok.body.avatarImage).toMatch(/^\/avatars\/av_[\w]+\.png$/);
    expect(fs.existsSync(path.join(UPLOAD_ROOT, ok.body.avatarImage))).toBe(true);
    expect(sai.status).toBe(400);
    expect(guiKemAnh.body.data.avatarImage).toBe(ok.body.avatarImage);
  });
});

describe('Admin duyệt / từ chối', () => {
  test('IT64: listener và artist gọi API admin → 403; không token → 401', async () => {
    const listener = await api().get('/api/admin/summary').set(auth(await dangNhap('ashley@example.com')));
    const artist = await api().get('/api/admin/artist-requests').set(auth(await dangNhap('mer@example.com')));
    const khongToken = await api().get('/api/admin/summary');
    ghiKetQua('IT64', `listener: ${listener.status}; artist: ${artist.status}; không token: ${khongToken.status}`);

    expect([listener.status, artist.status, khongToken.status]).toEqual([403, 403, 401]);
  });

  test('IT65: summary và danh sách: đếm đúng, đang chờ xếp cũ nhất trước, tìm theo email', async () => {
    const id1 = await taoYeuCauCuaAshley();
    await guiYeuCau(await dangNhap('jason@example.com'), { stageName: 'Jason Beats' });
    const token = await admin();
    const tom = await api().get('/api/admin/summary').set(auth(token));
    const ds = await api().get('/api/admin/artist-requests?status=pending').set(auth(token));
    const tim = await api().get('/api/admin/artist-requests').query({ q: 'jason@' }).set(auth(token));
    ghiKetQua('IT65', `summary: pending = ${tom.body.data?.pendingRequests}, users = ${tom.body.data?.users}; danh sách: [${ds.body.data?.map((r) => r.stageName).join(', ')}], counts.pending = ${ds.body.counts?.pending}; tìm "jason@": [${tim.body.data?.map((r) => r.stageName).join(', ')}]`);

    expect(tom.body.data.pendingRequests).toBe(2);
    expect(ds.body.data.map((r) => r.id)[0]).toBe(id1);
    expect(ds.body.data[0].applicant.email).toBe('ashley@example.com');
    expect(tim.body.data.map((r) => r.stageName)).toEqual(['Jason Beats']);
  });

  test('IT66: chi tiết yêu cầu có thông tin người gửi và nghệ danh còn trống', async () => {
    const id = await taoYeuCauCuaAshley();
    const res = await api().get(`/api/admin/artist-requests/${id}`).set(auth(await admin()));
    ghiKetQua('IT66', `${res.status}; người gửi: ${res.body.data?.applicant?.email} (${res.body.data?.applicant?.role}); nameAvailable = ${res.body.data?.nameAvailable}; previousRequests = ${res.body.data?.previousRequests}`);

    expect(res.status).toBe(200);
    expect(res.body.data.applicant).toMatchObject({ email: 'ashley@example.com', role: 'listener' });
    expect(res.body.data.nameAvailable).toBe(true);
    expect(res.body.data.previousRequests).toBe(0);
  });

  test('IT67: duyệt → tạo trang nghệ sĩ, đổi role, gửi thông báo, có tick xanh theo lựa chọn', async () => {
    const id = await taoYeuCauCuaAshley();
    const res = await api().post(`/api/admin/artist-requests/${id}/approve`).set(auth(await admin())).send({ verified: true });
    const ashley = await User.findOne({ id: 'u_ashley' });
    const trang = await Artist.findOne({ id: ashley.artistId });
    const yeuCau = await ArtistRequest.findOne({ id });
    const tb = await Notification.findOne({ userId: 'u_ashley', type: 'artist_request_approved' });
    const ngheSi = await api().get(`/api/artists/${ashley.artistId}`);
    ghiKetQua('IT67', `${res.status}; role = ${ashley.role}; trang: "${trang?.name}", owner = ${trang?.ownerUserId}, verified = ${trang?.isVerified}; request: ${yeuCau.status}, createdArtistId = ${yeuCau.createdArtistId}; thông báo: ${tb ? 'có' : 'không'}; GET trang: ${ngheSi.status}`);

    expect(res.status).toBe(200);
    expect(ashley.role).toBe('artist');
    expect(trang).toMatchObject({ name: 'Ashley S.', ownerUserId: 'u_ashley', isVerified: true, followersCount: 0 });
    expect(trang.genres).toEqual(['Pop', 'Ballad']);
    expect(yeuCau).toMatchObject({ status: 'approved', reviewedBy: 'u_admin', createdArtistId: trang.id });
    expect(tb.requestId).toBe(id);
    expect(ngheSi.status).toBe(200);
  });

  test('IT68: hai admin cùng duyệt → chỉ lần đầu thành công, chỉ 1 trang nghệ sĩ được tạo', async () => {
    const id = await taoYeuCauCuaAshley();
    const token = await admin();
    const truoc = await Artist.countDocuments();
    const [a, b] = await Promise.all([
      api().post(`/api/admin/artist-requests/${id}/approve`).set(auth(token)).send({}),
      api().post(`/api/admin/artist-requests/${id}/approve`).set(auth(token)).send({}),
    ]);
    const sau = await Artist.countDocuments();
    ghiKetQua('IT68', `Kết quả 2 lần bấm: [${[a.status, b.status].sort().join(', ')}]; số trang nghệ sĩ: ${truoc} → ${sau}`);

    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(sau - truoc).toBe(1);
  });

  test('IT69: từ chối không có lý do → 400; "Other" không ghi chú → 400; hợp lệ → rejected + thông báo', async () => {
    const id = await taoYeuCauCuaAshley();
    const token = await admin();
    const khongLyDo = await api().post(`/api/admin/artist-requests/${id}/reject`).set(auth(token)).send({});
    const otherRong = await api().post(`/api/admin/artist-requests/${id}/reject`).set(auth(token)).send({ reason: 'other' });
    const ok = await api().post(`/api/admin/artist-requests/${id}/reject`).set(auth(token)).send({ reason: 'incomplete_info', note: 'Bio quá ngắn' });
    const me = await api().get('/api/artist-requests/me').set(auth(await dangNhap('ashley@example.com')));
    const ashley = await User.findOne({ id: 'u_ashley' });
    const tb = await Notification.findOne({ userId: 'u_ashley', type: 'artist_request_rejected' });
    ghiKetQua('IT69', `Không lý do: ${khongLyDo.status}; Other rỗng: ${otherRong.status}; hợp lệ: ${ok.status}; người dùng thấy: "${me.body.data?.rejectReasonText}" + "${me.body.data?.rejectNote}"; role vẫn = ${ashley.role}; thông báo: ${tb ? 'có' : 'không'}`);

    expect([khongLyDo.status, otherRong.status, ok.status]).toEqual([400, 400, 200]);
    expect(me.body.data).toMatchObject({ status: 'rejected', rejectReasonText: 'Incomplete information', rejectNote: 'Bio quá ngắn' });
    expect(ashley.role).toBe('listener');
    expect(tb).not.toBeNull();
  });

  test('IT70: bị từ chối rồi gửi lại → được; chi tiết lần sau đếm previousRequests = 1', async () => {
    const token = await admin();
    const id1 = await taoYeuCauCuaAshley();
    await api().post(`/api/admin/artist-requests/${id1}/reject`).set(auth(token)).send({ reason: 'incomplete_info' });
    const id2 = await taoYeuCauCuaAshley({ bio: 'Bio mới đầy đủ hơn, viết về phong cách âm nhạc của tôi.' });
    const ct = await api().get(`/api/admin/artist-requests/${id2}`).set(auth(token));
    ghiKetQua('IT70', `Gửi lại: ${id2 ? 'thành công' : 'thất bại'}; previousRequests = ${ct.body.data?.previousRequests}`);

    expect(id2).toBeTruthy();
    expect(ct.body.data.previousRequests).toBe(1);
  });

  test('IT71: duyệt / từ chối yêu cầu đã xử lý hoặc không tồn tại → 409 / 404', async () => {
    const token = await admin();
    const id = await taoYeuCauCuaAshley();
    await api().post(`/api/admin/artist-requests/${id}/reject`).set(auth(token)).send({ reason: 'incomplete_info' });
    const duyetLai = await api().post(`/api/admin/artist-requests/${id}/approve`).set(auth(token)).send({});
    const khongCo = await api().post('/api/admin/artist-requests/khong-co/approve').set(auth(token)).send({});
    ghiKetQua('IT71', `Duyệt yêu cầu đã từ chối: ${duyetLai.status} ${duyetLai.body.code}; không tồn tại: ${khongCo.status}`);

    expect(duyetLai.status).toBe(409);
    expect(khongCo.status).toBe(404);
  });

  test('IT72: sau khi duyệt, nghệ sĩ mới vào được Artist Studio (API /api/studio)', async () => {
    const id = await taoYeuCauCuaAshley();
    const truoc = await api().get('/api/studio/songs').set(auth(await dangNhap('ashley@example.com')));
    await api().post(`/api/admin/artist-requests/${id}/approve`).set(auth(await admin())).send({});
    const sau = await api().get('/api/studio/songs').set(auth(await dangNhap('ashley@example.com')));
    ghiKetQua('IT72', `Trước khi duyệt: ${truoc.status}; sau khi duyệt: ${sau.status}, ${sau.body.count} bài`);

    expect(truoc.status).toBe(403);
    expect(sau.status).toBe(200);
  });
});
