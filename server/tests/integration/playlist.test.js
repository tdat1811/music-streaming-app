// Kiểm thử tích hợp: Playlist (IT20–IT26)
const { api, auth, dangNhap, ghiKetQua } = require('../helpers/api');
const { moDb, lamMoiDuLieu, dongDb } = require('../helpers/db');
const Playlist = require('../../src/models/Playlist');

beforeAll(moDb);
beforeEach(lamMoiDuLieu);
afterAll(dongDb);

const taoPlaylist = (token, title) => api().post('/api/playlists/create').set(auth(token)).send({ title });
const themBai = (token, playlistId, songId) => api().post('/api/playlists/add-song').set(auth(token)).send({ playlistId, songId });

describe('Playlist', () => {
  test('IT20: thành viên thường tạo playlist → 403, CSDL không có playlist mới', async () => {
    const token = await dangNhap('ashley@example.com');
    const res = await taoPlaylist(token, 'Nhạc học bài');
    const so = await Playlist.countDocuments({ title: 'Nhạc học bài' });
    ghiKetQua('IT20', `${res.status} "${res.body.message}"; số playlist "Nhạc học bài" trong CSDL: ${so}`);

    expect(res.status).toBe(403);
    expect(so).toBe(0);
  });

  test('IT21: VIP tạo "Chill" rồi "CHILL" → lần 2 bị từ chối vì trùng tên', async () => {
    const token = await dangNhap('jason@example.com');
    const lan1 = await taoPlaylist(token, 'Chill');
    const lan2 = await taoPlaylist(token, 'CHILL');
    const so = await Playlist.countDocuments({ ownerId: 'u_jason', title: /^chill$/i });
    ghiKetQua('IT21', `Lần 1: ${lan1.status}; lần 2: ${lan2.status} "${lan2.body.message}"; số playlist tên Chill của Jason: ${so}`);

    expect(lan1.status).toBe(201);
    expect(lan2.status).toBe(400);
    expect(lan2.body.message).toBe('Bạn đã có playlist với tên này.');
    expect(so).toBe(1);
  });

  test('IT22: thêm cùng một bài 2 lần → lần 2 bị từ chối, bài không bị trùng', async () => {
    const token = await dangNhap('jason@example.com');
    const lan1 = await themBai(token, 'p_jason', 's3');
    const lan2 = await themBai(token, 'p_jason', 's3');
    const pl = await Playlist.findOne({ id: 'p_jason' });
    ghiKetQua('IT22', `Lần 1: ${lan1.status}; lần 2: ${lan2.status} "${lan2.body.message}"; s3 xuất hiện ${pl.songIds.filter((id) => id === 's3').length} lần`);

    expect(lan1.status).toBe(200);
    expect(lan2.status).toBe(400);
    expect(pl.songIds.filter((id) => id === 's3')).toHaveLength(1);
  });

  test('IT23: thêm bài vào playlist của người khác → 403, playlist không đổi', async () => {
    const token = await dangNhap('ashley@example.com');
    const res = await themBai(token, 'p_jason', 's4');
    const pl = await Playlist.findOne({ id: 'p_jason' });
    ghiKetQua('IT23', `${res.status} "${res.body.message}"; songIds của p_jason: [${pl.songIds.join(', ')}]`);

    expect(res.status).toBe(403);
    expect(pl.songIds).toEqual(['s1']);
  });

  test('IT24: xoá bài khỏi playlist của mình → 200, CSDL không còn bài đó', async () => {
    const token = await dangNhap('jason@example.com');
    const res = await api().post('/api/playlists/remove-song').set(auth(token)).send({ playlistId: 'p_jason', songId: 's1' });
    const pl = await Playlist.findOne({ id: 'p_jason' });
    ghiKetQua('IT24', `${res.status}; songIds của p_jason: [${pl.songIds.join(', ')}]`);

    expect(res.status).toBe(200);
    expect(pl.songIds).not.toContain('s1');
  });

  test('IT25: xoá playlist – người khác bị 403, chủ sở hữu xoá được', async () => {
    const tokenAshley = await dangNhap('ashley@example.com');
    const tokenJason = await dangNhap('jason@example.com');
    const ashley = await api().delete('/api/playlists/p_jason').set(auth(tokenAshley));
    const conSauAshley = await Playlist.countDocuments({ id: 'p_jason' });
    const jason = await api().delete('/api/playlists/p_jason').set(auth(tokenJason));
    const conSauJason = await Playlist.countDocuments({ id: 'p_jason' });
    ghiKetQua('IT25', `Ashley xoá: ${ashley.status} (playlist còn: ${conSauAshley}); Jason xoá: ${jason.status} (playlist còn: ${conSauJason})`);

    expect(ashley.status).toBe(403);
    expect(conSauAshley).toBe(1);
    expect(jason.status).toBe(200);
    expect(conSauJason).toBe(0);
  });

  test('IT26: xem danh sách playlist của người khác → 403', async () => {
    const token = await dangNhap('ashley@example.com');
    const res = await api().get('/api/playlists/user/u_jason').set(auth(token));
    ghiKetQua('IT26', `${res.status} "${res.body.message}"`);

    expect(res.status).toBe(403);
  });
});
