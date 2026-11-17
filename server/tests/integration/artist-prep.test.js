// Kiểm thử tích hợp: các thay đổi chuẩn bị cho role Artist / Admin (IT39–IT55)
// File tải lên được ghi vào thư mục tạm (UPLOAD_ROOT), không ghi vào server/public.
const fs = require('fs');
const os = require('os');
const path = require('path');
const UPLOAD_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'music-upload-test-'));
process.env.UPLOAD_ROOT = UPLOAD_ROOT;

const mongoose = require('mongoose');
const { api, auth, dangNhap, ghiKetQua } = require('../helpers/api');
const { moDb, lamMoiDuLieu, dongDb } = require('../helpers/db');
const User = require('../../src/models/User');
const Song = require('../../src/models/Song');
const Artist = require('../../src/models/Artist');
const Album = require('../../src/models/Album');
const Playlist = require('../../src/models/Playlist');
const { migrate } = require('../../src/seed/migrateArtistAdmin');

beforeAll(moDb);
beforeEach(async () => {
  await lamMoiDuLieu();
  // Mỗi test bắt đầu với thư mục upload rỗng
  for (const sub of ['audio', 'covers']) {
    const dir = path.join(UPLOAD_ROOT, sub);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  }
});
afterAll(async () => {
  await dongDb();
  fs.rmSync(UPLOAD_ROOT, { recursive: true, force: true });
});

const NGAY_MS = 24 * 60 * 60 * 1000;
const soNgay = (from, to) => Math.round((new Date(to) - new Date(from)) / NGAY_MS);
const filesIn = (sub) => fs.readdirSync(path.join(UPLOAD_ROOT, sub));
// Nội dung giả của file mp3 (chỉ cần đúng tên / loại file, server không giải mã âm thanh)
const MP3 = Buffer.from('ID3 fake mp3 data');

const taiBai = (token, { title = 'Bài mới', file = MP3, filename = 'song.mp3', contentType = 'audio/mpeg', extra = { genre: 'Pop' } } = {}) => {
  let req = api().post('/api/studio/songs');
  if (token) req = req.set(auth(token));
  if (title !== null) req = req.field('title', title);
  Object.entries(extra).forEach(([k, v]) => { req = req.field(k, v); });
  if (file) req = req.attach('audio', file, { filename, contentType });
  return req;
};

describe('Gói VIP có ngày hết hạn', () => {
  test('IT39: thành viên thường đăng ký premium → planExpiresAt = 1 tháng sau', async () => {
    // Gói VIP trả bằng số dư ví (59.000đ) – nạp sẵn tiền cho tài khoản
    await User.updateOne({ id: 'u_ashley' }, { balance: 59000 });
    const token = await dangNhap('ashley@example.com');
    const truoc = Date.now();
    const res = await api().post('/api/auth/subscribe').set(auth(token)).send({ planId: 'premium' });
    const ashley = await User.findOne({ id: 'u_ashley' });
    const ngay = soNgay(truoc, ashley.planExpiresAt);
    ghiKetQua('IT39', `${res.status}; CSDL planId = ${ashley.planId}; hết hạn sau ${ngay} ngày`);

    expect(res.status).toBe(200);
    expect(new Date(res.body.data.planExpiresAt).getTime()).toBe(ashley.planExpiresAt.getTime());
    expect(ngay).toBeGreaterThanOrEqual(28);
    expect(ngay).toBeLessThanOrEqual(31);
  });

  test('IT40: VIP còn hạn gia hạn → cộng dồn từ ngày hết hạn cũ', async () => {
    // Gói VIP trả bằng số dư ví (59.000đ) – nạp sẵn tiền cho tài khoản
    await User.updateOne({ id: 'u_jason' }, { balance: 59000 });
    const cu = (await User.findOne({ id: 'u_jason' })).planExpiresAt;
    const token = await dangNhap('jason@example.com');
    const res = await api().post('/api/auth/subscribe').set(auth(token)).send({ planId: 'premium' });
    const moi = (await User.findOne({ id: 'u_jason' })).planExpiresAt;
    ghiKetQua('IT40', `${res.status} "${res.body.message}"; hạn cũ + ${soNgay(cu, moi)} ngày`);

    expect(res.status).toBe(200);
    expect(soNgay(cu, moi)).toBeGreaterThanOrEqual(28);
    expect(soNgay(cu, moi)).toBeLessThanOrEqual(31);
  });

  test('IT41: VIP đã hết hạn → không tạo playlist / tải nhạc được (403)', async () => {
    const token = await dangNhap('kevin@example.com');
    const pl = await api().post('/api/playlists/create').set(auth(token)).send({ title: 'Kevin Mix' });
    const dl = await api().post('/api/auth/download-song').set(auth(token)).send({ songId: 's1' });
    ghiKetQua('IT41', `Tạo playlist: ${pl.status}; tải nhạc: ${dl.status}`);

    expect(pl.status).toBe(403);
    expect(dl.status).toBe(403);
  });

  test('IT42: chuyển về gói free → planExpiresAt = null', async () => {
    const token = await dangNhap('jason@example.com');
    const res = await api().post('/api/auth/subscribe').set(auth(token)).send({ planId: 'free' });
    const jason = await User.findOne({ id: 'u_jason' });
    ghiKetQua('IT42', `${res.status}; planId = ${jason.planId}; planExpiresAt = ${jason.planExpiresAt}`);

    expect(res.status).toBe(200);
    expect(jason.planExpiresAt).toBeNull();
  });
});

describe('Đổi tên playlist', () => {
  test('IT43: chủ playlist đổi tên → 200, CSDL cập nhật', async () => {
    const token = await dangNhap('jason@example.com');
    const res = await api().put('/api/playlists/p_jason').set(auth(token)).send({ title: '  Nhạc chạy bộ  ' });
    const pl = await Playlist.findOne({ id: 'p_jason' });
    ghiKetQua('IT43', `${res.status}; CSDL title = "${pl.title}"`);

    expect(res.status).toBe(200);
    expect(pl.title).toBe('Nhạc chạy bộ');
  });

  test('IT44: tên rỗng / trùng playlist khác / không phải chủ / không token → 400, 400, 403, 401', async () => {
    const jason = await dangNhap('jason@example.com');
    await Playlist.create({ id: 'p_jason2', ownerId: 'u_jason', title: 'Gym' });
    const rong = await api().put('/api/playlists/p_jason').set(auth(jason)).send({ title: '   ' });
    const trung = await api().put('/api/playlists/p_jason').set(auth(jason)).send({ title: 'GYM' });
    const ashley = await dangNhap('ashley@example.com');
    const khongChu = await api().put('/api/playlists/p_jason').set(auth(ashley)).send({ title: 'Của Ashley' });
    const khongToken = await api().put('/api/playlists/p_jason').send({ title: 'X' });
    const pl = await Playlist.findOne({ id: 'p_jason' });
    ghiKetQua('IT44', `Rỗng: ${rong.status}; trùng: ${trung.status}; không phải chủ: ${khongChu.status}; không token: ${khongToken.status}; CSDL title = "${pl.title}"`);

    expect([rong.status, trung.status, khongChu.status, khongToken.status]).toEqual([400, 400, 403, 401]);
    expect(pl.title).toBe('Jason Mix');
  });

  test('IT45: đổi tên giữ nguyên chữ nhưng khác hoa thường → được phép', async () => {
    const token = await dangNhap('jason@example.com');
    const res = await api().put('/api/playlists/p_jason').set(auth(token)).send({ title: 'JASON MIX' });
    ghiKetQua('IT45', `${res.status}; title = ${res.body.data?.title}`);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('JASON MIX');
  });
});

describe('Lượt nghe dạng số và bài hát công khai', () => {
  test('IT46: ba người nghe s1 → plays tăng đúng 3; bài nháp / không tồn tại → 404', async () => {
    const truoc = (await Song.findOne({ id: 's1' })).plays;
    // Ba người nghe khác nhau (từ giai đoạn 4, cùng một người nghe lại trong 10 phút chỉ tính 1 lượt)
    for (const email of ['ashley@example.com', 'jason@example.com', 'lan@example.com']) {
      await api().post('/api/songs/s1/play').set(auth(await dangNhap(email)));
    }
    const sau = (await Song.findOne({ id: 's1' })).plays;
    const nhap = await api().post('/api/songs/s_draft/play');
    const khongCo = await api().post('/api/songs/khong-co/play');
    ghiKetQua('IT46', `plays: ${truoc} → ${sau} (kiểu ${typeof sau}); bài nháp: ${nhap.status}; không tồn tại: ${khongCo.status}`);

    expect(typeof sau).toBe('number');
    expect(sau - truoc).toBe(3);
    expect(nhap.status).toBe(404);
    expect(khongCo.status).toBe(404);
  });

  test('IT57: bài còn plays dạng chuỗi (chưa migrate) → nghe vẫn được, plays đổi sang số và +1', async () => {
    await Song.collection.updateOne({ id: 's6' }, { $set: { plays: '3.4M' } });
    const res = await api().post('/api/songs/s6/play');
    const raw = await Song.collection.findOne({ id: 's6' });
    ghiKetQua('IT57', `${res.status}; plays trả về = ${res.body.plays}; CSDL plays = ${raw.plays} (kiểu ${typeof raw.plays})`);

    expect(res.status).toBe(200);
    expect(raw.plays).toBe(3400001);
    expect(res.body.plays).toBe(3400001);
  });

  test('IT47: bài nháp không xuất hiện ở danh sách, tìm kiếm, chi tiết và trang nghệ sĩ', async () => {
    const tatCa = await api().get('/api/songs');
    const tim = await api().get('/api/songs/search').query({ q: 'Bản nháp' });
    const chiTiet = await api().get('/api/songs/s_draft');
    const ngheSi = await api().get('/api/artists/a_mer');
    const coNhap = (list) => (list || []).some((s) => s.id === 's_draft');
    ghiKetQua('IT47', `/songs có nháp: ${coNhap(tatCa.body.data)}; tìm kiếm có nháp: ${coNhap(tim.body.songs)}; chi tiết: ${chiTiet.status}; trang nghệ sĩ có nháp: ${coNhap(ngheSi.body.data?.tracks)}`);

    expect(tatCa.body.count).toBe(20);
    expect(coNhap(tatCa.body.data)).toBe(false);
    expect(coNhap(tim.body.songs)).toBe(false);
    expect(chiTiet.status).toBe(404);
    expect(coNhap(ngheSi.body.data.tracks)).toBe(false);
  });
});

describe('Liên kết nghệ sĩ bằng artistId', () => {
  test('IT48: trang nghệ sĩ lấy bài theo artistId (kể cả tên có "ft.")', async () => {
    const res = await api().get('/api/artists/a_weeknd');
    const ids = res.body.data.tracks.map((t) => t.id).sort();
    ghiKetQua('IT48', `${res.status}; bài của The Weeknd: [${ids.join(', ')}]`);

    expect(res.status).toBe(200);
    expect(ids).toEqual(['s1', 's2', 's3']);
  });

  test('IT49: theo dõi rồi bỏ theo dõi → followersCount 100 → 101 → 100', async () => {
    const token = await dangNhap('ashley@example.com');
    const lan1 = await api().post('/api/auth/follow-artist').set(auth(token)).send({ artistId: 'a_weeknd' });
    const sau1 = (await Artist.findOne({ id: 'a_weeknd' })).followersCount;
    const lan2 = await api().post('/api/auth/follow-artist').set(auth(token)).send({ artistId: 'a_weeknd' });
    const sau2 = (await Artist.findOne({ id: 'a_weeknd' })).followersCount;
    ghiKetQua('IT49', `Lần 1: ${lan1.status}, followersCount = ${sau1}; lần 2: ${lan2.status}, followersCount = ${sau2}`);

    expect([sau1, sau2]).toEqual([101, 100]);
    expect(lan1.body.followersCount).toBe(101);
  });

  test('IT50: bảng tin lấy tên / ảnh tác giả từ Artist; bài cũ giữ tên đã lưu', async () => {
    await Artist.updateOne({ id: 'a_weeknd' }, { name: 'The Weeknd (đổi tên)' });
    const res = await api().get('/api/feed/posts');
    const fp1 = res.body.data.find((p) => p.id === 'fp1');
    const fp2 = res.body.data.find((p) => p.id === 'fp2');
    ghiKetQua('IT50', `${res.status}; fp2: "${fp2.authorName}", ảnh ${fp2.authorAvatar ? 'có' : 'không'}, verified = ${fp2.authorVerified}; fp1: "${fp1.authorName}"`);

    expect(fp2.authorName).toBe('The Weeknd (đổi tên)');
    expect(fp2.authorAvatar).toBe('https://example.com/weeknd.jpg');
    expect(fp2.authorVerified).toBe(true);
    expect(fp1.authorName).toBe('Soundwave');
  });
});

describe('Role và API tải bài hát (Artist Studio)', () => {
  test('IT51: đăng nhập trả về role và artistId; tài khoản mới mặc định listener', async () => {
    const mer = await api().post('/api/auth/login').send({ email: 'mer@example.com', password: '123456' });
    const moi = await api().post('/api/auth/register').send({ name: 'Người mới', email: 'moi@example.com', password: '123456' });
    ghiKetQua('IT51', `Mer: role = ${mer.body.data.role}, artistId = ${mer.body.data.artistId}; tài khoản mới: role = ${moi.body.data.role}`);

    expect(mer.body.data.role).toBe('artist');
    expect(mer.body.data.artistId).toBe('a_mer');
    expect(moi.body.data.role).toBe('listener');
  });

  test('IT52: /api/studio/songs – không token 401, listener 403, artist 200 (thấy cả bài nháp)', async () => {
    const khongToken = await api().get('/api/studio/songs');
    const listener = await api().get('/api/studio/songs').set(auth(await dangNhap('ashley@example.com')));
    const artist = await api().get('/api/studio/songs').set(auth(await dangNhap('mer@example.com')));
    ghiKetQua('IT52', `Không token: ${khongToken.status}; listener: ${listener.status} (${listener.body.code}); artist: ${artist.status}, ${artist.body.count} bài`);

    expect(khongToken.status).toBe(401);
    expect(listener.status).toBe(403);
    expect(artist.status).toBe(200);
    expect(artist.body.data.map((s) => s.id)).toEqual(['s_draft']);
  });

  test('IT53: nghệ sĩ tải mp3 + ảnh bìa → 201, lưu file, bài thuộc đúng nghệ sĩ, nghe được', async () => {
    const token = await dangNhap('mer@example.com');
    const res = await taiBai(token, { title: 'Đêm trăng', extra: { genre: 'Ballad' } })
      .attach('cover', Buffer.from('fake png'), { filename: 'cover.PNG', contentType: 'image/png' });
    const song = await Song.findOne({ id: res.body.data?.id });
    const stream = await api().get(`/api/songs/${song.id}/stream`);
    const ngheSi = await api().get('/api/artists/a_mer');
    ghiKetQua('IT53', `${res.status}; artistId = ${song.artistId}; plays = ${song.plays}; audioUrl = ${song.audioUrl}; cover = ${song.coverImage}; stream: ${stream.status}; trang nghệ sĩ có bài: ${ngheSi.body.data.tracks.some((t) => t.id === song.id)}`);

    expect(res.status).toBe(201);
    expect(song).toMatchObject({ title: 'Đêm trăng', artist: 'Mer Watson', artistId: 'a_mer', plays: 0, duration: '', genre: 'Ballad', status: 'published' });
    expect(song.audioUrl).toBe(`/audio/${song.id}.mp3`);
    expect(song.coverImage).toBe(`/covers/${song.id}.png`);
    expect(filesIn('audio')).toContain(`${song.id}.mp3`);
    expect(filesIn('covers')).toContain(`${song.id}.png`);
    expect(stream.status).toBe(200);
    expect(ngheSi.body.data.tracks.some((t) => t.id === song.id)).toBe(true);
  });

  test('IT54: listener / artist chưa có trang → 403 và không để lại file', async () => {
    const listener = await taiBai(await dangNhap('ashley@example.com'));
    const chuaCoTrang = await taiBai(await dangNhap('lan@example.com'));
    const conFile = filesIn('audio').length;
    ghiKetQua('IT54', `Listener: ${listener.status}; artist chưa có trang: ${chuaCoTrang.status} "${chuaCoTrang.body.message}"; số file còn lại: ${conFile}`);

    expect(listener.status).toBe(403);
    expect(chuaCoTrang.status).toBe(403);
    expect(conFile).toBe(0);
    expect(await Song.countDocuments({ artistId: null, title: 'Bài mới' })).toBe(0);
  });

  test('IT55: file sai định dạng / thiếu tên / thiếu file / thể loại sai / quá 20 MB → 400, 400, 400, 400, 413', async () => {
    const token = await dangNhap('mer@example.com');
    const exe = await taiBai(token, { filename: 'virus.exe', contentType: 'application/x-msdownload' });
    const thieuTen = await taiBai(token, { title: null });
    const thieuFile = await taiBai(token, { file: null });
    const saiThoiLuong = await taiBai(token, { extra: { genre: 'Opera' } }); // thể loại không hợp lệ
    const quaLon = await taiBai(token, { file: Buffer.alloc(20 * 1024 * 1024 + 1) });
    const conFile = filesIn('audio').length;
    const soBai = await Song.countDocuments({ artistId: 'a_mer' });
    ghiKetQua('IT55', `exe: ${exe.status}; thiếu tên: ${thieuTen.status}; thiếu file: ${thieuFile.status}; thể loại sai: ${saiThoiLuong.status}; quá lớn: ${quaLon.status}; file còn lại: ${conFile}; bài của Mer trong CSDL: ${soBai}`);

    expect([exe.status, thieuTen.status, thieuFile.status, saiThoiLuong.status, quaLon.status]).toEqual([400, 400, 400, 400, 413]);
    expect(conFile).toBe(0);
    expect(soBai).toBe(1); // chỉ còn bài nháp có sẵn
  });
});

describe('Script chuyển dữ liệu cũ (migrateArtistAdmin)', () => {
  test('IT56: chuyển dữ liệu kiểu cũ sang kiểu mới; chạy lần 2 không sửa gì', async () => {
    const db = mongoose.connection.db;
    await db.dropDatabase();
    // Dữ liệu y như database cũ: plays / followers là chuỗi, chưa có artistId, role, planExpiresAt
    await db.collection('artists').insertOne({ id: 'art1', name: 'The Weeknd', followers: '85.4M Followers' });
    await db.collection('songs').insertMany([
      { id: 's1', title: 'Blinding Lights', artist: 'The Weeknd', plays: '12.8M' },
      { id: 's2', title: 'Starboy', artist: 'The Weeknd ft. Daft Punk', plays: '2,1M' },
      { id: 's3', title: 'Khác', artist: 'Ai đó', plays: '950K' },
    ]);
    await db.collection('albums').insertOne({ id: 'alb1', title: 'After Hours', artist: 'The Weeknd' });
    await db.collection('feedposts').insertOne({ id: 'fp1', authorName: 'The Weeknd', songId: 's1' });
    await db.collection('users').insertMany([
      { id: 'u1', name: 'A', email: 'a@x.com', password: 'x', planId: null },
      { id: 'u2', name: 'B', email: 'b@x.com', password: 'x', planId: 'premium' },
    ]);

    const lan1 = await migrate(db);
    const lan2 = await migrate(db);
    const s = await Song.find().sort({ id: 1 }).lean();
    const a = await db.collection('artists').findOne({ id: 'art1' });
    const al = await Album.findOne({ id: 'alb1' }).lean();
    const fp = await db.collection('feedposts').findOne({ id: 'fp1' });
    const [u1, u2] = await User.find().sort({ id: 1 }).lean();
    ghiKetQua('IT56', `Lần 1 sửa: ${JSON.stringify(lan1)}; lần 2 sửa: ${JSON.stringify(lan2)}; plays = [${s.map((x) => x.plays).join(', ')}]; artistId = [${s.map((x) => x.artistId).join(', ')}]; followersCount = ${a.followersCount}; fp1.authorArtistId = ${fp.authorArtistId}; u2 hết hạn sau ${soNgay(Date.now(), u2.planExpiresAt)} ngày`);

    expect(s.map((x) => x.plays)).toEqual([12800000, 2100000, 950000]);
    expect(s.map((x) => x.artistId)).toEqual(['art1', 'art1', null]);
    expect(s.every((x) => x.status === 'published')).toBe(true);
    expect(a.followersCount).toBe(85400000);
    expect(a.followers).toBeUndefined();
    expect(al.artistId).toBe('art1');
    expect(fp.authorArtistId).toBe('art1');
    expect([u1.role, u2.role]).toEqual(['listener', 'listener']);
    expect(u1.planExpiresAt).toBeNull();
    expect(soNgay(Date.now(), u2.planExpiresAt)).toBeGreaterThanOrEqual(27);
    expect(Object.values(lan2).every((n) => n === 0)).toBe(true);
  });
});

