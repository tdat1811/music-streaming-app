// Kiểm thử tích hợp: giai đoạn 5 – báo cáo, gỡ nội dung, vi phạm, khoá vĩnh viễn, khoá tay, ẩn trang nghệ sĩ (IT131–IT145)
const bcrypt = require('bcryptjs');
const { api, auth, dangNhap, ghiKetQua } = require('../helpers/api');
const { moDb, lamMoiDuLieu, dongDb } = require('../helpers/db');
const User = require('../../src/models/User');
const Song = require('../../src/models/Song');
const Artist = require('../../src/models/Artist');
const FeedPost = require('../../src/models/FeedPost');
const Comment = require('../../src/models/Comment');
const Report = require('../../src/models/Report');
const Violation = require('../../src/models/Violation');
const Notification = require('../../src/models/Notification');
const AdminAction = require('../../src/models/AdminAction');

beforeAll(moDb);
beforeEach(async () => {
  await lamMoiDuLieu();
  // Bài đã đăng của Mer + bài đăng có bình luận của Jason (4 bình luận để thử đủ 4 lần vi phạm)
  await Song.create({ id: 's_mer1', title: 'Mùa thu Hà Nội', artist: 'Mer Watson', artistId: 'a_mer', status: 'published', plays: 10 });
  await FeedPost.create({ id: 'fp_mer', authorArtistId: 'a_mer', authorName: 'Mer Watson', content: 'Thank you all!', songId: 's_mer1' });
  await Comment.create(
    [1, 2, 3, 4].map((i) => ({ id: `c_spam${i}`, postId: 'fp_mer', userId: 'u_jason', userName: 'Jason Smith', text: `Buy followers #${i}`, replies: [] }))
  );
  // Admin thứ hai để thử đổi role
  await User.create({ id: 'u_admin2', name: 'Second Admin', email: 'admin2@example.com', password: await bcrypt.hash('123456', 4), role: 'admin' });
});
afterAll(dongDb);

const admin = () => dangNhap('admin@example.com');
const baoCao = async (token, targetType, targetId, reason = 'spam') =>
  api().post('/api/reports').set(auth(token)).send({ targetType, targetId, reason });
const go = async (token, type, id, rule = 'spam') =>
  api().post(`/api/admin/manage/content/${type}/${id}/remove`).set(auth(token)).send({ rule });
const binhLuan = async () => (await api().get('/api/feed/comments/fp_mer')).body.data.map((c) => c.id);

describe('Người nghe báo cáo', () => {
  test('IT131: báo cáo bình luận → 201; báo cáo lại → 409; tự báo cáo mình → 400; khách → 401; nội dung không có → 404', async () => {
    const ashley = await dangNhap('ashley@example.com');
    const lan1 = await baoCao(ashley, 'comment', 'c_spam1');
    const lan2 = await baoCao(ashley, 'comment', 'c_spam1');
    const tuBaoCao = await baoCao(await dangNhap('jason@example.com'), 'comment', 'c_spam1');
    const khach = await api().post('/api/reports').send({ targetType: 'comment', targetId: 'c_spam1', reason: 'spam' });
    const khongCo = await baoCao(ashley, 'song', 'khong-co');
    const db = await Report.findOne({ targetId: 'c_spam1' }).lean();
    ghiKetQua('IT131', `Lần 1: ${lan1.status}; lần 2: ${lan2.status} ${lan2.body.code}; tự báo cáo: ${tuBaoCao.status} ${tuBaoCao.body.code}; khách: ${khach.status}; không có: ${khongCo.status}; CSDL: tác giả ${db.authorUserId}, "${db.snapshot}"`);

    expect([lan1.status, lan2.status, tuBaoCao.status, khach.status, khongCo.status]).toEqual([201, 409, 400, 401, 404]);
    expect(db).toMatchObject({ authorUserId: 'u_jason', status: 'open', snapshot: 'Buy followers #1' });
  });

  test('IT132: tối đa 10 báo cáo / ngày → báo cáo thứ 11 bị 429', async () => {
    const ashley = await dangNhap('ashley@example.com');
    await Comment.create(Array.from({ length: 11 }, (_, i) => ({ id: `c_x${i}`, postId: 'fp_mer', userId: 'u_kevin', userName: 'Kevin', text: `x${i}`, replies: [] })));
    const kq = [];
    for (let i = 0; i < 11; i++) kq.push((await baoCao(ashley, 'comment', `c_x${i}`)).status);
    ghiKetQua('IT132', `10 báo cáo đầu: ${kq.slice(0, 10).every((s) => s === 201) ? 'đều 201' : kq.slice(0, 10).join(',')}; thứ 11: ${kq[10]}`);
    expect(kq.slice(0, 10).every((s) => s === 201)).toBe(true);
    expect(kq[10]).toBe(429);
  });
});

describe('Gỡ nội dung và vi phạm', () => {
  test('IT133: admin gỡ bình luận → biến mất khỏi Feed, tác giả nhận thông báo, lưu 1 vi phạm, báo cáo được đóng', async () => {
    await baoCao(await dangNhap('ashley@example.com'), 'comment', 'c_spam1');
    const token = await admin();
    const truoc = await binhLuan();
    const res = await go(token, 'comment', 'c_spam1');
    const sau = await binhLuan();
    const tb = await Notification.findOne({ userId: 'u_jason', type: 'content_removed' }).lean();
    const v = await Violation.findOne({ userId: 'u_jason' }).lean();
    const rp = await Report.findOne({ targetId: 'c_spam1' }).lean();
    ghiKetQua('IT133', `${res.status}; bình luận ${truoc.length} → ${sau.length} (c_spam1 còn: ${sau.includes('c_spam1')}); thông báo: ${tb?.rule}, lần ${tb?.violationCount}, "${tb?.text}"; vi phạm: ${v?.targetType} "${v?.snapshot}"; báo cáo: ${rp.status}/${rp.outcome}`);

    expect(res.status).toBe(200);
    expect(sau).not.toContain('c_spam1');
    expect(sau.length).toBe(truoc.length - 1);
    expect(tb).toMatchObject({ targetType: 'comment', rule: 'spam', violationCount: 1, text: 'Buy followers #1' });
    expect(v).toMatchObject({ targetType: 'comment', targetId: 'c_spam1', snapshot: 'Buy followers #1', adminId: 'u_admin', reportCount: 1 });
    expect(rp).toMatchObject({ status: 'resolved', outcome: 'removed' });
  });

  test('IT134: vi phạm lần thứ 4 → khoá vĩnh viễn; đăng nhập 403 ACCOUNT_LOCKED; token cũ bị từ chối; không mở khoá được', async () => {
    const jasonCu = await dangNhap('jason@example.com');
    const token = await admin();
    const ketQua = [];
    for (let i = 1; i <= 4; i++) ketQua.push((await go(token, 'comment', `c_spam${i}`)).body);
    const u = await User.findOne({ id: 'u_jason' }).lean();
    const login = await api().post('/api/auth/login').send({ email: 'jason@example.com', password: '123456' });
    const tokenCu = await api().get('/api/notifications').set(auth(jasonCu));
    const moKhoa = await api().post('/api/admin/manage/users/u_jason/unlock').set(auth(token));
    const chiTiet = (await api().get('/api/admin/manage/users/u_jason').set(auth(token))).body.data;
    ghiKetQua('IT134', `Lần 3: locked = ${ketQua[2].locked}; lần 4: locked = ${ketQua[3].locked}, count = ${ketQua[3].violationCount}; CSDL: ${u.lockType} by ${u.lockedBy}; đăng nhập: ${login.status} ${login.body.code} "${login.body.message}"; token cũ: ${tokenCu.status} ${tokenCu.body.code}; unlock: ${moKhoa.status} ${moKhoa.body.code}; can.unlock = ${chiTiet.can.unlock}`);

    expect(ketQua.map((r) => r.locked)).toEqual([false, false, false, true]);
    expect(u).toMatchObject({ lockType: 'permanent', lockedBy: 'auto' });
    expect(login.status).toBe(403);
    expect(login.body).toMatchObject({ code: 'ACCOUNT_LOCKED', lockType: 'permanent' });
    expect(tokenCu.status).toBe(403);
    expect(moKhoa.status).toBe(409);
    expect(moKhoa.body.code).toBe('PERMANENT_LOCK');
    expect(chiTiet).toMatchObject({ activeViolations: 4, lock: { type: 'permanent', byName: 'Automatically' }, can: { unlock: false } });
  });

  test('IT135: revoke 1 vi phạm của tài khoản khoá vĩnh viễn → còn 3 → tự mở khoá, bình luận hiện lại', async () => {
    const token = await admin();
    for (let i = 1; i <= 4; i++) await go(token, 'comment', `c_spam${i}`);
    const v2 = await Violation.findOne({ targetId: 'c_spam2' }).lean();
    const res = await api().post(`/api/admin/manage/violations/${v2.id}/revoke`).set(auth(token));
    const lai = await api().post(`/api/admin/manage/violations/${v2.id}/revoke`).set(auth(token));
    const u = await User.findOne({ id: 'u_jason' }).lean();
    const login = await api().post('/api/auth/login').send({ email: 'jason@example.com', password: '123456' });
    const hanhDong = await AdminAction.find({ targetId: 'u_jason' }).sort({ createdAt: 1 }).lean();
    ghiKetQua('IT135', `Revoke: ${res.status}, còn ${res.body.violationCount}, unlocked = ${res.body.unlocked}; revoke lại: ${lai.status}; CSDL lockedAt = ${u.lockedAt}; đăng nhập: ${login.status}; c_spam2 hiện lại: ${(await binhLuan()).includes('c_spam2')}; nhật ký: ${hanhDong.map((a) => a.action).join(', ')}`);

    expect(res.body).toMatchObject({ violationCount: 3, unlocked: true });
    expect(lai.status).toBe(409);
    expect(u.lockedAt).toBeNull();
    expect(login.status).toBe(200);
    expect(await binhLuan()).toContain('c_spam2');
    expect(hanhDong.map((a) => a.action)).toEqual(['auto_lock', 'auto_unlock']);
  });

  test('IT136: bỏ qua báo cáo (dismiss) → không tính vi phạm, nội dung vẫn hiện', async () => {
    await baoCao(await dangNhap('ashley@example.com'), 'comment', 'c_spam1');
    const token = await admin();
    const res = await api().post('/api/admin/manage/reports/comment/c_spam1/dismiss').set(auth(token));
    const lai = await api().post('/api/admin/manage/reports/comment/c_spam1/dismiss').set(auth(token));
    const rp = await Report.findOne({ targetId: 'c_spam1' }).lean();
    ghiKetQua('IT136', `Dismiss: ${res.status}, ${res.body.dismissed} báo cáo; lần 2: ${lai.status}; báo cáo: ${rp.outcome}; vi phạm: ${await Violation.countDocuments()}; bình luận còn: ${(await binhLuan()).includes('c_spam1')}`);
    expect([res.status, lai.status]).toEqual([200, 409]);
    expect(rp.outcome).toBe('dismissed');
    expect(await Violation.countDocuments()).toBe(0);
    expect(await binhLuan()).toContain('c_spam1');
  });

  test('IT137: gỡ bài hát và bài đăng của nghệ sĩ → tính vào cùng bộ đếm của tài khoản chủ trang; người nghe không thấy; nghệ sĩ không hiện lại được', async () => {
    const token = await admin();
    await go(token, 'song', 's_mer1', 'copyright');
    await go(token, 'post', 'fp_mer', 'spam');
    const bai = await api().get('/api/songs/s_mer1');
    const feed = (await api().get('/api/feed/posts')).body.data.map((p) => p.id);
    const mer = await dangNhap('mer@example.com');
    const hienLai = await api().patch('/api/studio/songs/s_mer1/status').set(auth(mer)).send({ status: 'published' });
    const suaBai = await api().put('/api/feed/posts/fp_mer').set(auth(mer)).send({ content: 'edit' });
    const studio = (await api().get('/api/studio/songs').set(auth(mer))).body.data.find((s) => s.id === 's_mer1');
    const so = await Violation.countDocuments({ userId: 'u_mer', revokedAt: null });
    ghiKetQua('IT137', `Bài hát công khai: ${bai.status}; bài đăng còn trên Feed: ${feed.includes('fp_mer')}; vi phạm của Mer: ${so}; nghệ sĩ hiện lại: ${hienLai.status} ${hienLai.body.code}; sửa bài đăng: ${suaBai.status} ${suaBai.body.code}; Studio thấy removedRule = ${studio.removedRule}`);

    expect(bai.status).toBe(404);
    expect(feed).not.toContain('fp_mer');
    expect(so).toBe(2);
    expect([hienLai.status, hienLai.body.code]).toEqual([403, 'SONG_REMOVED']);
    expect([suaBai.status, suaBai.body.code]).toEqual([403, 'POST_REMOVED']);
    expect(studio.removedRule).toBe('copyright');
  });

  test('IT138: chi tiết báo cáo cảnh báo trước khi lần gỡ này sẽ khoá tài khoản (willLock)', async () => {
    const token = await admin();
    for (let i = 1; i <= 3; i++) await go(token, 'comment', `c_spam${i}`);
    await baoCao(await dangNhap('ashley@example.com'), 'comment', 'c_spam4');
    const d = (await api().get('/api/admin/manage/reports/comment/c_spam4').set(auth(token))).body.data;
    const list = (await api().get('/api/admin/manage/reports').set(auth(token))).body;
    ghiKetQua('IT138', `Tác giả ${d.author.name}: ${d.author.violations}/${d.maxViolations}, willLock = ${d.willLock}; ngữ cảnh: ${d.context}; danh sách: ${list.data.length} nội dung, segments = ${JSON.stringify(list.segments)}`);
    expect(d).toMatchObject({ willLock: true, status: 'open', author: { id: 'u_jason', violations: 3 } });
    expect(d.reports[0]).toMatchObject({ reporterName: 'Ashley Scott', reason: 'spam' });
    expect(list.data[0]).toMatchObject({ targetType: 'comment', targetId: 'c_spam4', count: 1, author: { violations: 3 } });
  });
});

describe('Khoá tay, đổi role, trang nghệ sĩ', () => {
  test('IT139: khoá tay nghệ sĩ → trang, bài hát, bài đăng, bình luận của họ ẩn; mở khoá → hiện lại', async () => {
    const token = await admin();
    await Comment.create({ id: 'c_mer', postId: 'fp_mer', userId: 'u_mer', userName: 'Mer Watson', text: 'Thanks!', replies: [] });
    const khoa = await api().post('/api/admin/manage/users/u_mer/lock').set(auth(token)).send({ rule: 'scam', note: 'Asking for money' });
    const trang = await api().get('/api/artists/a_mer');
    const ds = (await api().get('/api/artists')).body.data.map((a) => a.id);
    const bai = await api().get('/api/songs/s_mer1');
    const feed = (await api().get('/api/feed/posts')).body.data.map((p) => p.id);
    const moKhoa = await api().post('/api/admin/manage/users/u_mer/unlock').set(auth(token));
    const trangSau = await api().get('/api/artists/a_mer');
    const baiSau = await api().get('/api/songs/s_mer1');
    ghiKetQua('IT139', `Khoá: ${khoa.status}; khi khoá → trang ${trang.status}, trong danh sách: ${ds.includes('a_mer')}, bài hát ${bai.status}, bài đăng trên Feed: ${feed.includes('fp_mer')}; mở khoá: ${moKhoa.status} → trang ${trangSau.status}, bài hát ${baiSau.status}`);

    expect(khoa.status).toBe(200);
    expect([trang.status, bai.status]).toEqual([404, 404]);
    expect(ds).not.toContain('a_mer');
    expect(feed).not.toContain('fp_mer');
    expect(moKhoa.status).toBe(200);
    expect([trangSau.status, baiSau.status]).toEqual([200, 200]);
  });

  test('IT140: bình luận của người bị khoá tay biến mất, mở khoá thì hiện lại', async () => {
    const token = await admin();
    await api().post('/api/admin/manage/users/u_jason/lock').set(auth(token)).send({ rule: 'spam' });
    const khiKhoa = await binhLuan();
    await api().post('/api/admin/manage/users/u_jason/unlock').set(auth(token));
    const sau = await binhLuan();
    ghiKetQua('IT140', `Khi khoá: ${khiKhoa.filter((id) => id.startsWith('c_spam')).length} bình luận của Jason; sau mở khoá: ${sau.filter((id) => id.startsWith('c_spam')).length}`);
    expect(khiKhoa.filter((id) => id.startsWith('c_spam'))).toHaveLength(0);
    expect(sau.filter((id) => id.startsWith('c_spam'))).toHaveLength(4);
  });

  test('IT141: không khoá chính mình / admin khác; không khoá 2 lần; thiếu lý do → 400', async () => {
    const token = await admin();
    const chinhMinh = await api().post('/api/admin/manage/users/u_admin/lock').set(auth(token)).send({ rule: 'spam' });
    const adminKhac = await api().post('/api/admin/manage/users/u_admin2/lock').set(auth(token)).send({ rule: 'spam' });
    const thieu = await api().post('/api/admin/manage/users/u_jason/lock').set(auth(token)).send({});
    await api().post('/api/admin/manage/users/u_jason/lock').set(auth(token)).send({ rule: 'spam' });
    const lan2 = await api().post('/api/admin/manage/users/u_jason/lock').set(auth(token)).send({ rule: 'spam' });
    ghiKetQua('IT141', `Chính mình: ${chinhMinh.status}; admin khác: ${adminKhac.status}; thiếu lý do: ${thieu.status}; khoá lần 2: ${lan2.status}`);
    expect([chinhMinh.status, adminKhac.status, thieu.status, lan2.status]).toEqual([409, 409, 400, 409]);
  });

  test('IT142: đổi role Listener ↔ Admin; không tự đổi; không đổi nghệ sĩ; người được lên admin vào được khu Admin', async () => {
    const token = await admin();
    const lenAdmin = await api().post('/api/admin/manage/users/u_ashley/role').set(auth(token)).send({ role: 'admin' });
    const ashley = await dangNhap('ashley@example.com');
    const vaoAdmin = await api().get('/api/admin/summary').set(auth(ashley));
    const tuDoi = await api().post('/api/admin/manage/users/u_admin/role').set(auth(token)).send({ role: 'listener' });
    const ngheSi = await api().post('/api/admin/manage/users/u_mer/role').set(auth(token)).send({ role: 'admin' });
    const thanhArtist = await api().post('/api/admin/manage/users/u_jason/role').set(auth(token)).send({ role: 'artist' });
    const haXuong = await api().post('/api/admin/manage/users/u_ashley/role').set(auth(token)).send({ role: 'listener' });
    ghiKetQua('IT142', `Ashley lên admin: ${lenAdmin.status}, vào /admin/summary: ${vaoAdmin.status}; tự đổi: ${tuDoi.status}; đổi nghệ sĩ: ${ngheSi.status}; đặt role artist: ${thanhArtist.status}; hạ Ashley về listener: ${haXuong.status}`);
    expect([lenAdmin.status, vaoAdmin.status, tuDoi.status, ngheSi.status, thanhArtist.status, haXuong.status]).toEqual([200, 200, 400, 400, 400, 200]);
  });

  test('IT143: ẩn trang nghệ sĩ → người nghe không thấy, nghệ sĩ nhận thông báo, không đăng / tải thêm được; hiện lại → bình thường', async () => {
    const token = await admin();
    const an = await api().post('/api/admin/manage/artists/a_mer/hide').set(auth(token)).send({ rule: 'copyright' });
    const trang = await api().get('/api/artists/a_mer');
    const mer = await dangNhap('mer@example.com');
    const dangBai = await api().post('/api/feed/posts').set(auth(mer)).send({ content: 'Still here' });
    const tb = await Notification.findOne({ userId: 'u_mer', type: 'artist_page_hidden' }).lean();
    const hien = await api().post('/api/admin/manage/artists/a_mer/unhide').set(auth(token));
    const trangSau = await api().get('/api/artists/a_mer');
    const tick = await api().post('/api/admin/manage/artists/a_mer/verified').set(auth(token)).send({ verified: false });
    const a = await Artist.findOne({ id: 'a_mer' }).lean();
    ghiKetQua('IT143', `Ẩn: ${an.status} → trang ${trang.status}; nghệ sĩ đăng bài: ${dangBai.status} ${dangBai.body.code}; thông báo: ${tb?.rule}; hiện lại: ${hien.status} → trang ${trangSau.status}; tắt tick: ${tick.status}, isVerified = ${a.isVerified}`);
    expect([an.status, trang.status, dangBai.status, hien.status, trangSau.status]).toEqual([200, 404, 403, 200, 200]);
    expect(dangBai.body.code).toBe('PAGE_HIDDEN');
    expect(tb).toMatchObject({ rule: 'copyright' });
    expect(a.isVerified).toBe(false);
  });

  test('IT144: danh sách Users / Artists lọc đúng; chi tiết tài khoản có lịch sử vi phạm; người nghe gọi API admin → 403', async () => {
    const token = await admin();
    await go(token, 'comment', 'c_spam1', 'harassment');
    const coViPham = (await api().get('/api/admin/manage/users?filter=violations').set(auth(token))).body;
    const timKiem = (await api().get('/api/admin/manage/users?q=ashley').set(auth(token))).body.data.map((u) => u.id);
    const artists = (await api().get('/api/admin/manage/artists?filter=verified').set(auth(token))).body.data.map((a) => a.id);
    const chiTiet = (await api().get('/api/admin/manage/users/u_jason').set(auth(token))).body.data;
    const nguoiNghe = await api().get('/api/admin/manage/users').set(auth(await dangNhap('jason@example.com')));
    ghiKetQua('IT144', `Có vi phạm: [${coViPham.data.map((u) => `${u.name} ${u.violations}`).join(', ')}]; tìm "ashley": [${timKiem}]; nghệ sĩ có tick: [${artists}]; Jason: ${chiTiet.activeViolations}/${chiTiet.maxViolations}, lần 1 = ${chiTiet.violations[0].ruleLabel} by ${chiTiet.violations[0].adminName}; người nghe gọi API: ${nguoiNghe.status}`);
    expect(coViPham.data.map((u) => [u.id, u.violations])).toEqual([['u_jason', 1]]);
    expect(timKiem).toEqual(['u_ashley']);
    expect(artists).toEqual(expect.arrayContaining(['a_weeknd', 'a_mer']));
    expect(chiTiet.violations[0]).toMatchObject({ ruleLabel: 'Harassment or hate speech', adminName: 'Admin Team', snapshot: 'Buy followers #1' });
    expect(nguoiNghe.status).toBe(403);
  });

  test('IT145: Dashboard có số báo cáo, vi phạm, tài khoản bị khoá / sắp khoá và nhật ký gần đây', async () => {
    const token = await admin();
    await baoCao(await dangNhap('ashley@example.com'), 'song', 's_mer1', 'copyright');
    for (let i = 1; i <= 3; i++) await go(token, 'comment', `c_spam${i}`);
    await api().post('/api/admin/manage/users/u_kevin/lock').set(auth(token)).send({ rule: 'scam' });
    const d = (await api().get('/api/admin/summary').set(auth(token))).body.data;
    ghiKetQua('IT145', `openReports = ${d.openReports} (${JSON.stringify(d.openReportsByType)}); violations = ${d.violations} (+${d.violationsThisWeek} tuần này); locked = ${d.lockedUsers}; 3/3 = ${d.usersAtLimit}; nhật ký: ${d.recentActions.map((a) => a.action).join(', ')}`);
    expect(d).toMatchObject({ openReports: 1, violations: 3, violationsThisWeek: 3, lockedUsers: 1, usersAtLimit: 1 });
    expect(d.openReportsByType.song).toBe(1);
    expect(d.recentActions[0]).toMatchObject({ action: 'lock', targetLabel: 'Kevin Brown', ruleLabel: 'Scam or fraud', adminName: 'Admin Team' });
  });

  test('IT152: /api/moderation/hidden trả id trang nghệ sĩ và bài hát đang bị ẩn (để app lọc dữ liệu có sẵn); hiện lại thì bỏ khỏi danh sách', async () => {
    const token = await admin();
    const truoc = (await api().get('/api/moderation/hidden')).body.data;
    await api().post('/api/admin/manage/artists/a_mer/hide').set(auth(token)).send({ rule: 'copyright' });
    await go(token, 'song', 's1', 'copyright');
    const khiAn = (await api().get('/api/moderation/hidden')).body.data;
    await api().post('/api/admin/manage/artists/a_mer/unhide').set(auth(token));
    const sau = (await api().get('/api/moderation/hidden')).body.data;
    ghiKetQua('IT152', `Trước: ${JSON.stringify(truoc)}; khi ẩn: nghệ sĩ [${khiAn.artists.map((a) => a.name)}], bài [${khiAn.songIds}]; sau khi hiện lại trang: nghệ sĩ [${sau.artists.map((a) => a.name)}], bài [${sau.songIds}]`);
    expect(truoc).toEqual({ artists: [], songIds: [] });
    expect(khiAn.artists).toEqual([{ id: 'a_mer', name: 'Mer Watson' }]);
    expect(khiAn.songIds.sort()).toEqual(['s1', 's_draft', 's_mer1']);
    expect(sau.artists).toEqual([]);
    expect(sau.songIds).toEqual(['s1']);
  });
});
