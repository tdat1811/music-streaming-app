// Kiểm thử tích hợp: Artist Studio – bài hát, album, trang nghệ sĩ; và phía người nghe (IT78–IT92)
const fs = require('fs');
const os = require('os');
const path = require('path');
const UPLOAD_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'music-studio-test-'));
process.env.UPLOAD_ROOT = UPLOAD_ROOT;

const { api, auth, dangNhap, ghiKetQua } = require('../helpers/api');
const { moDb, lamMoiDuLieu, dongDb } = require('../helpers/db');
const Song = require('../../src/models/Song');
const Album = require('../../src/models/Album');
const Artist = require('../../src/models/Artist');
const Playlist = require('../../src/models/Playlist');
const User = require('../../src/models/User');

beforeAll(moDb);
beforeEach(async () => {
  await lamMoiDuLieu();
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

// File nhạc thật (để đọc được thời lượng) lấy từ dữ liệu mẫu của project
const REAL_AUDIO = path.join(__dirname, '..', '..', 'public', 'audio', 's8.m4a');
const FAKE_MP3 = Buffer.from('ID3 fake mp3');
const files = (sub) => fs.readdirSync(path.join(UPLOAD_ROOT, sub));
const mer = () => dangNhap('mer@example.com');

const taiBai = (token, { title = 'Bài mới', genre = 'Pop', status, file = FAKE_MP3, filename = 'song.mp3' } = {}) => {
  let req = api().post('/api/studio/songs').set(auth(token)).field('title', title).field('genre', genre);
  if (status) req = req.field('status', status);
  return req.attach('audio', file, { filename, contentType: filename.endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg' });
};
const taiAnh = (token) =>
  api().post('/api/studio/images').set(auth(token)).attach('image', Buffer.from('png'), { filename: 'c.png', contentType: 'image/png' });

describe('Bài hát trong Studio', () => {
  test('IT78: tải file nhạc thật → đọc được thời lượng; overview đếm đúng', async () => {
    const token = await mer();
    const res = await taiBai(token, { title: 'Bài thật', file: fs.readFileSync(REAL_AUDIO), filename: 'that.m4a' });
    const tong = await api().get('/api/studio/overview').set(auth(token));
    ghiKetQua('IT78', `${res.status}; duration = "${res.body.data?.duration}"; overview: ${tong.body.data?.songs?.total} bài (published ${tong.body.data?.songs?.published}, draft ${tong.body.data?.songs?.draft})`);

    expect(res.status).toBe(201);
    expect(res.body.data.duration).toMatch(/^\d{2}:\d{2}$/);
    expect(tong.body.data.songs).toMatchObject({ total: 2, published: 1, draft: 1 });
  });

  test('IT79: lưu nháp → người nghe không thấy; đăng → thấy ở trang nghệ sĩ và tìm kiếm', async () => {
    const token = await mer();
    const id = (await taiBai(token, { title: 'Late Night Drive', status: 'draft' })).body.data.id;
    const timTruoc = await api().get('/api/songs/search').query({ q: 'late night' });
    const dang = await api().patch(`/api/studio/songs/${id}/status`).set(auth(token)).send({ status: 'published' });
    const timSau = await api().get('/api/songs/search').query({ q: 'late night' });
    const trang = await api().get('/api/artists/a_mer');
    const co = (list) => (list || []).some((s) => s.id === id);
    ghiKetQua('IT79', `Nháp – tìm thấy: ${co(timTruoc.body.songs)}; đăng: ${dang.status}; sau khi đăng – tìm thấy: ${co(timSau.body.songs)}, trang nghệ sĩ có: ${co(trang.body.data.tracks)}`);

    expect(co(timTruoc.body.songs)).toBe(false);
    expect(dang.status).toBe(200);
    expect(co(timSau.body.songs)).toBe(true);
    expect(co(trang.body.data.tracks)).toBe(true);
  });

  test('IT80: sửa thông tin + đổi ảnh bìa; thể loại ngoài danh sách → 400', async () => {
    const token = await mer();
    const id = (await taiBai(token)).body.data.id;
    const anh = await taiAnh(token);
    const sua = await api().put(`/api/studio/songs/${id}`).set(auth(token)).send({ title: 'Tên mới', description: 'Mô tả', coverImage: anh.body.image });
    const sai = await api().put(`/api/studio/songs/${id}`).set(auth(token)).send({ genre: 'Opera' });
    const db = await Song.findOne({ id });
    ghiKetQua('IT80', `Tải ảnh: ${anh.status} ${anh.body.image}; sửa: ${sua.status}; CSDL: "${db.title}", cover = ${db.coverImage}; thể loại sai: ${sai.status}`);

    expect(sua.status).toBe(200);
    expect(db).toMatchObject({ title: 'Tên mới', description: 'Mô tả', coverImage: anh.body.image });
    expect(sai.status).toBe(400);
  });

  test('IT81: bài đã có lượt nghe → không xoá được (409), không về nháp được (400), ẩn được', async () => {
    const token = await mer();
    const id = (await taiBai(token)).body.data.id;
    await api().post(`/api/songs/${id}/play`);
    const xoa = await api().delete(`/api/studio/songs/${id}`).set(auth(token));
    const veNhap = await api().patch(`/api/studio/songs/${id}/status`).set(auth(token)).send({ status: 'draft' });
    const an = await api().patch(`/api/studio/songs/${id}/status`).set(auth(token)).send({ status: 'hidden' });
    const tim = await api().get(`/api/songs/${id}`);
    ghiKetQua('IT81', `Xoá: ${xoa.status} ${xoa.body.code}; về nháp: ${veNhap.status}; ẩn: ${an.status}; người nghe mở bài: ${tim.status}; bài vẫn còn trong CSDL: ${!!(await Song.exists({ id }))}`);

    expect(xoa.status).toBe(409);
    expect(veNhap.status).toBe(400);
    expect(an.status).toBe(200);
    expect(tim.status).toBe(404);
    expect(await Song.exists({ id })).toBeTruthy();
  });

  test('IT82: bài chưa có lượt nghe → xoá được: mất khỏi CSDL, album, playlist và xoá file', async () => {
    const token = await mer();
    const id = (await taiBai(token)).body.data.id;
    await Playlist.updateOne({ id: 'p_jason' }, { $push: { songIds: id } });
    await api().post('/api/studio/albums').set(auth(token)).send({ title: 'EP', releaseYear: '2026', songIds: [id], status: 'draft' });
    const truocFile = files('audio').length;
    const xoa = await api().delete(`/api/studio/songs/${id}`).set(auth(token));
    const pl = await Playlist.findOne({ id: 'p_jason' });
    const al = await Album.findOne({ artistId: 'a_mer', title: 'EP' });
    ghiKetQua('IT82', `Xoá: ${xoa.status}; còn trong CSDL: ${!!(await Song.exists({ id }))}; playlist còn bài: ${pl.songIds.includes(id)}; album còn bài: ${al.songIds.includes(id)}; file nhạc: ${truocFile} → ${files('audio').length}`);

    expect(xoa.status).toBe(200);
    expect(await Song.exists({ id })).toBeNull();
    expect(pl.songIds).not.toContain(id);
    expect(al.songIds).not.toContain(id);
    expect(files('audio').length).toBe(truocFile - 1);
  });

  test('IT83: nghệ sĩ khác không sửa / xoá / đổi trạng thái được bài của Mer (404); listener → 403', async () => {
    const id = (await taiBai(await mer())).body.data.id;
    // Gắn cho Lan một trang nghệ sĩ riêng để thành nghệ sĩ hợp lệ
    await Artist.create({ id: 'a_lan', name: 'Lan Band', ownerUserId: 'u_lan' });
    await User.updateOne({ id: 'u_lan' }, { artistId: 'a_lan' });
    const lan = await dangNhap('lan@example.com');
    const sua = await api().put(`/api/studio/songs/${id}`).set(auth(lan)).send({ title: 'Cướp bài' });
    const xoa = await api().delete(`/api/studio/songs/${id}`).set(auth(lan));
    const an = await api().patch(`/api/studio/songs/${id}/status`).set(auth(lan)).send({ status: 'hidden' });
    const listener = await api().get('/api/studio/overview').set(auth(await dangNhap('ashley@example.com')));
    const db = await Song.findOne({ id });
    ghiKetQua('IT83', `Nghệ sĩ khác – sửa: ${sua.status}, xoá: ${xoa.status}, ẩn: ${an.status}; listener vào Studio: ${listener.status}; tên bài vẫn là "${db.title}"`);

    expect([sua.status, xoa.status, an.status]).toEqual([404, 404, 404]);
    expect(listener.status).toBe(403);
    expect(db.title).toBe('Bài mới');
  });

  test('IT84: bài bị ẩn biến khỏi playlist của người nghe', async () => {
    const token = await mer();
    const id = (await taiBai(token)).body.data.id;
    await Playlist.updateOne({ id: 'p_jason' }, { $push: { songIds: id } });
    const jason = await dangNhap('jason@example.com');
    const truoc = await api().get('/api/playlists/p_jason').set(auth(jason));
    await api().patch(`/api/studio/songs/${id}/status`).set(auth(token)).send({ status: 'hidden' });
    const sau = await api().get('/api/playlists/p_jason').set(auth(jason));
    const byIds = await api().post('/api/songs/by-ids').send({ ids: [id] });
    const co = (r) => r.body.data.tracks.some((t) => t.id === id);
    ghiKetQua('IT84', `Trước khi ẩn: playlist có bài = ${co(truoc)}; sau khi ẩn: ${co(sau)}; /songs/by-ids trả ${byIds.body.count} bài`);

    expect(co(truoc)).toBe(true);
    expect(co(sau)).toBe(false);
    expect(byIds.body.count).toBe(0);
  });
});

describe('Album trong Studio', () => {
  test('IT85: tạo album nháp, thêm bài, đăng → người nghe chỉ thấy bài đã đăng', async () => {
    const token = await mer();
    const pub = (await taiBai(token, { title: 'Đã đăng' })).body.data.id;
    const draft = (await taiBai(token, { title: 'Nháp', status: 'draft' })).body.data.id;
    const tao = await api().post('/api/studio/albums').set(auth(token)).send({ title: 'Hà Nội Stories', releaseYear: '2026', songIds: [pub, 's_draft', draft], status: 'published' });
    const albumId = tao.body.data?.id;
    const nguoiNghe = await api().get(`/api/albums/${albumId}`);
    const trang = await api().get('/api/artists/a_mer');
    const alTrenTrang = trang.body.data.albums.find((a) => a.id === albumId);
    ghiKetQua('IT85', `Tạo: ${tao.status}, publishedSongCount = ${tao.body.data?.publishedSongCount}; người nghe xem album: [${nguoiNghe.body.data?.tracks?.map((t) => t.title).join(', ')}]; trang nghệ sĩ: album có ${alTrenTrang?.songIds.length} bài`);

    expect(tao.status).toBe(201);
    expect(tao.body.data.publishedSongCount).toBe(1);
    expect(nguoiNghe.body.data.tracks.map((t) => t.id)).toEqual([pub]);
    expect(alTrenTrang.songIds).toEqual([pub]);
  });

  test('IT86: album không có bài đã đăng thì không đăng được; bài của nghệ sĩ khác → 400', async () => {
    const token = await mer();
    const draft = (await taiBai(token, { status: 'draft' })).body.data.id;
    const khongBai = await api().post('/api/studio/albums').set(auth(token)).send({ title: 'A', releaseYear: '2026', songIds: [draft], status: 'published' });
    const baiNguoiKhac = await api().post('/api/studio/albums').set(auth(token)).send({ title: 'B', releaseYear: '2026', songIds: ['s1'], status: 'draft' });
    ghiKetQua('IT86', `Đăng album chỉ có bài nháp: ${khongBai.status} "${khongBai.body.message}"; thêm bài của The Weeknd: ${baiNguoiKhac.status}`);

    expect(khongBai.status).toBe(400);
    expect(baiNguoiKhac.status).toBe(400);
    expect(await Album.countDocuments({ artistId: 'a_mer' })).toBe(0);
  });

  test('IT87: sửa thứ tự bài, xoá album không xoá bài hát; album nháp không hiện công khai', async () => {
    const token = await mer();
    const a = (await taiBai(token, { title: 'A' })).body.data.id;
    const b = (await taiBai(token, { title: 'B' })).body.data.id;
    const id = (await api().post('/api/studio/albums').set(auth(token)).send({ title: 'EP', releaseYear: '2026', songIds: [a, b], status: 'draft' })).body.data.id;
    const congKhai = await api().get(`/api/albums/${id}`);
    const doiThuTu = await api().put(`/api/studio/albums/${id}`).set(auth(token)).send({ title: 'EP', releaseYear: '2026', songIds: [b, a] });
    const xoa = await api().delete(`/api/studio/albums/${id}`).set(auth(token));
    ghiKetQua('IT87', `Album nháp – người nghe mở: ${congKhai.status}; đổi thứ tự: [${doiThuTu.body.data?.songIds.join(', ')}] (status giữ: ${doiThuTu.body.data?.status}); xoá album: ${xoa.status}; 2 bài vẫn còn: ${(await Song.countDocuments({ id: { $in: [a, b] } })) === 2}`);

    expect(congKhai.status).toBe(404);
    expect(doiThuTu.body.data.songIds).toEqual([b, a]);
    expect(doiThuTu.body.data.status).toBe('draft');
    expect(xoa.status).toBe(200);
    expect(await Song.countDocuments({ id: { $in: [a, b] } })).toBe(2);
  });
});

describe('Trang nghệ sĩ', () => {
  const PAGE = { stageName: 'Mer Watson', genres: ['Acoustic', 'Indie'], bio: 'Acoustic songwriter from the coast.', socialLinks: ['instagram.com/mer'] };

  test('IT88: sửa tiểu sử, thể loại, ảnh → trang công khai cập nhật', async () => {
    const token = await mer();
    const anh = await taiAnh(token);
    const res = await api().put('/api/studio/profile').set(auth(token)).send({ ...PAGE, avatarImage: anh.body.image });
    const trang = await api().get('/api/artists/a_mer');
    ghiKetQua('IT88', `${res.status}; trang công khai: bio = "${trang.body.data.bio}", genres = [${trang.body.data.genres}], avatar = ${trang.body.data.avatarImage}`);

    expect(res.status).toBe(200);
    expect(trang.body.data).toMatchObject({ bio: PAGE.bio, genres: PAGE.genres, avatarImage: anh.body.image });
  });

  test('IT89: đổi nghệ danh → tên trên bài hát, album, bảng tin đổi theo; liên kết vẫn đúng', async () => {
    const token = await mer();
    const id = (await taiBai(token, { genre: 'Acoustic' })).body.data.id;
    await api().put('/api/studio/profile').set(auth(token)).send(PAGE);
    await api().post('/api/studio/albums').set(auth(token)).send({ title: 'EP', releaseYear: '2026', songIds: [id], status: 'published' });
    const doi = await api().put('/api/studio/profile').set(auth(token)).send({ ...PAGE, stageName: 'Mer & The Waves' });
    const bai = await Song.findOne({ id });
    const album = await Album.findOne({ artistId: 'a_mer' });
    const tim = await api().get('/api/songs/search').query({ q: 'mer waves' });
    ghiKetQua('IT89', `Đổi tên: ${doi.status}; bài hát: artist = "${bai.artist}"; album: artist = "${album.artist}"; tìm "mer waves": ${tim.body.songs?.some((s) => s.id === id)}`);

    expect(doi.status).toBe(200);
    expect(bai.artist).toBe('Mer & The Waves');
    expect(album.artist).toBe('Mer & The Waves');
    expect(tim.body.songs.some((s) => s.id === id)).toBe(true);
  });

  test('IT90: đổi nghệ danh trùng nghệ sĩ khác (khác dấu / hoa thường) → 409; giữ nguyên tên mình → được', async () => {
    const token = await mer();
    const trung = await api().put('/api/studio/profile').set(auth(token)).send({ ...PAGE, stageName: 'son tung m-tp' });
    const giuNguyen = await api().put('/api/studio/profile').set(auth(token)).send({ ...PAGE, stageName: 'MER WATSON' });
    ghiKetQua('IT90', `Trùng "Sơn Tùng M-TP": ${trung.status} ${trung.body.code}; đổi hoa thường tên của mình: ${giuNguyen.status}`);

    expect(trung.status).toBe(409);
    expect(trung.body.code).toBe('NAME_TAKEN');
    expect(giuNguyen.status).toBe(200);
  });

  test('IT91: ảnh: tải png → 201, file .gif → 400, đường dẫn ảnh lạ → 400', async () => {
    const token = await mer();
    const ok = await taiAnh(token);
    const gif = await api().post('/api/studio/images').set(auth(token)).attach('image', Buffer.from('g'), { filename: 'a.gif', contentType: 'image/gif' });
    const la = await api().put('/api/studio/profile').set(auth(token)).send({ ...PAGE, aboutImage: 'https://evil.com/x.png' });
    ghiKetQua('IT91', `png: ${ok.status} ${ok.body.image}; gif: ${gif.status}; đường dẫn lạ: ${la.status}`);

    expect(ok.status).toBe(201);
    expect(files('covers')).toContain(path.basename(ok.body.image));
    expect([gif.status, la.status]).toEqual([400, 400]);
  });

  test('IT92: danh sách bài của tôi lọc theo trạng thái', async () => {
    const token = await mer();
    await taiBai(token, { title: 'P1' });
    await taiBai(token, { title: 'D1', status: 'draft' });
    const tatCa = await api().get('/api/studio/songs').set(auth(token));
    const nhap = await api().get('/api/studio/songs?status=draft').set(auth(token));
    ghiKetQua('IT92', `Tất cả: ${tatCa.body.count} bài; nháp: [${nhap.body.data.map((s) => s.title).join(', ')}]`);

    expect(tatCa.body.count).toBe(3); // 2 bài mới + bài nháp có sẵn của Mer
    expect(nhap.body.data.map((s) => s.title).sort()).toEqual(['Bản nháp chưa phát hành', 'D1']);
  });
});
