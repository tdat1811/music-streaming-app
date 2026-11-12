// Kiểm thử tích hợp: các yêu cầu bảo mật và phân quyền theo báo cáo (IT36–IT38).
// Viết theo YÊU CẦU (NFR-S06, Bảng 1.2) nên có thể Fail nếu mã nguồn chưa đáp ứng.
const { api, ghiKetQua } = require('../helpers/api');
const { moDb, lamMoiDuLieu, dongDb } = require('../helpers/db');
const FeedPost = require('../../src/models/FeedPost');

beforeAll(moDb);
beforeEach(lamMoiDuLieu);
afterAll(dongDb);

describe('Bảo mật và phân quyền theo yêu cầu', () => {
  test('IT36: xem hồ sơ người khác không cần đăng nhập → phải bị chặn (401/403), không lộ email, SĐT', async () => {
    const res = await api().get('/api/auth/profile/u_jason');
    const lo = res.body.data ? `có lộ: email = ${res.body.data.email}, phone = "${res.body.data.phone}", likedSongIds = [${res.body.data.likedSongIds}]` : 'không lộ dữ liệu';
    ghiKetQua('IT36', `${res.status}; ${lo}`);

    expect([401, 403]).toContain(res.status);
    expect(res.body.data?.email).toBeUndefined();
  });

  test('IT37: xem playlist của người khác không cần đăng nhập → phải bị chặn (401/403)', async () => {
    const res = await api().get('/api/playlists/p_jason');
    ghiKetQua('IT37', `${res.status}; ${res.body.data ? `trả về playlist "${res.body.data.title}" của ${res.body.data.ownerId}` : 'không trả dữ liệu'}`);

    expect([401, 403]).toContain(res.status);
  });

  test('IT38: khách chia sẻ bài đăng → theo Bảng 1.2 lượt chia sẻ phải được lưu', async () => {
    const res = await api().post('/api/feed/posts/share').send({ postId: 'fp1' });
    const post = await FeedPost.findOne({ id: 'fp1' });
    ghiKetQua('IT38', `${res.status} ${res.body.code || ''}; shares trong CSDL: ${post.shares} (trước đó 5)`);

    expect(res.status).toBe(200);
    expect(post.shares).toBe(6);
  });
});
