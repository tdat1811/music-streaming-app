// Kiểm thử tích hợp: Gói hội viên, thả tim, theo dõi, tải xuống (IT11–IT15)
const { api, auth, dangNhap, ghiKetQua } = require('../helpers/api');
const { moDb, lamMoiDuLieu, dongDb } = require('../helpers/db');
const User = require('../../src/models/User');

beforeAll(moDb);
beforeEach(lamMoiDuLieu);
afterAll(dongDb);

describe('Gói hội viên và tương tác của tài khoản', () => {
  test('IT11: đăng ký gói premium → 200, CSDL lưu planId = premium', async () => {
    const token = await dangNhap('ashley@example.com');
    const res = await api().post('/api/auth/subscribe').set(auth(token)).send({ planId: 'premium' });
    const ashley = await User.findOne({ id: 'u_ashley' });
    ghiKetQua('IT11', `${res.status}; data.planId = ${res.body.data?.planId}; CSDL planId = ${ashley.planId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.planId).toBe('premium');
    expect(ashley.planId).toBe('premium');
  });

  test('IT12: đăng ký gói "family" (không tồn tại) → 400, planId không đổi', async () => {
    const token = await dangNhap('ashley@example.com');
    const res = await api().post('/api/auth/subscribe').set(auth(token)).send({ planId: 'family' });
    const ashley = await User.findOne({ id: 'u_ashley' });
    ghiKetQua('IT12', `${res.status} "${res.body.message}"; CSDL planId = ${ashley.planId}`);

    expect(res.status).toBe(400);
    expect(ashley.planId).toBeNull();
  });

  test('IT13: thả tim một bài 2 lần → lần 1 thêm, lần 2 bỏ', async () => {
    const token = await dangNhap('ashley@example.com');
    const lan1 = await api().post('/api/auth/like-song').set(auth(token)).send({ songId: 's2' });
    const sauLan1 = (await User.findOne({ id: 'u_ashley' })).likedSongIds;
    const lan2 = await api().post('/api/auth/like-song').set(auth(token)).send({ songId: 's2' });
    const sauLan2 = (await User.findOne({ id: 'u_ashley' })).likedSongIds;
    ghiKetQua('IT13', `Lần 1: ${lan1.status}, isLiked = ${lan1.body.isLiked}, CSDL [${sauLan1.join(', ')}]; Lần 2: ${lan2.status}, isLiked = ${lan2.body.isLiked}, CSDL [${sauLan2.join(', ')}]`);

    expect(lan1.body.isLiked).toBe(true);
    expect(sauLan1).toContain('s2');
    expect(lan2.body.isLiked).toBe(false);
    expect(sauLan2).not.toContain('s2');
  });

  test('IT14: theo dõi nghệ sĩ 2 lần → lần 1 theo dõi, lần 2 bỏ theo dõi', async () => {
    const token = await dangNhap('ashley@example.com');
    const lan1 = await api().post('/api/auth/follow-artist').set(auth(token)).send({ artistId: 'a_weeknd' });
    const sauLan1 = (await User.findOne({ id: 'u_ashley' })).followedArtistIds;
    const lan2 = await api().post('/api/auth/follow-artist').set(auth(token)).send({ artistId: 'a_weeknd' });
    const sauLan2 = (await User.findOne({ id: 'u_ashley' })).followedArtistIds;
    ghiKetQua('IT14', `Lần 1: ${lan1.status}, isFollowing = ${lan1.body.isFollowing}, CSDL [${sauLan1.join(', ')}]; Lần 2: ${lan2.status}, isFollowing = ${lan2.body.isFollowing}, CSDL [${sauLan2.join(', ')}]`);

    expect(lan1.body.isFollowing).toBe(true);
    expect(sauLan1).toContain('a_weeknd');
    expect(lan2.body.isFollowing).toBe(false);
    expect(sauLan2).not.toContain('a_weeknd');
  });

  test('IT15: tải bài hát – thường bị chặn 403, VIP tải được, không lưu trùng', async () => {
    const tokenAshley = await dangNhap('ashley@example.com');
    const tokenJason = await dangNhap('jason@example.com');
    const ashley = await api().post('/api/auth/download-song').set(auth(tokenAshley)).send({ songId: 's1' });
    const jason1 = await api().post('/api/auth/download-song').set(auth(tokenJason)).send({ songId: 's1' });
    const jason2 = await api().post('/api/auth/download-song').set(auth(tokenJason)).send({ songId: 's1' });
    const ds = (await User.findOne({ id: 'u_jason' })).downloadedSongIds;
    ghiKetQua('IT15', `Ashley: ${ashley.status}; Jason lần 1: ${jason1.status}, lần 2: ${jason2.status}; CSDL Jason có s1 ${ds.filter((id) => id === 's1').length} lần`);

    expect(ashley.status).toBe(403);
    expect(jason1.status).toBe(200);
    expect(jason2.status).toBe(200);
    expect(ds.filter((id) => id === 's1')).toHaveLength(1);
  });
});
