// Kiểm thử tích hợp: Tìm kiếm tương đối (IT16–IT19)
const { api, ghiKetQua } = require('../helpers/api');
const { moDb, lamMoiDuLieu, dongDb } = require('../helpers/db');

beforeAll(moDb);
beforeEach(lamMoiDuLieu);
afterAll(dongDb);

const timKiem = (q) => api().get('/api/songs/search').query({ q });

describe('Tìm kiếm bài hát', () => {
  test('IT16: gõ sai "weekend" → vẫn ra đủ các bài của The Weeknd', async () => {
    const res = await timKiem('weekend');
    const titles = (res.body.songs || []).map((s) => s.title);
    ghiKetQua('IT16', `${res.status}; songs: [${titles.join(', ')}]; suggestions là chuỗi: ${(res.body.suggestions || []).every((s) => typeof s === 'string')}`);

    expect(res.status).toBe(200);
    expect(titles).toEqual(expect.arrayContaining(['Blinding Lights', 'Starboy', 'Save Your Tears']));
    expect(res.body.suggestions.every((s) => typeof s === 'string')).toBe(true);
  });

  test('IT17: gõ "son tung" (không dấu) → các bài của Sơn Tùng M-TP đứng đầu', async () => {
    const res = await timKiem('son tung');
    const songs = res.body.songs || [];
    ghiKetQua('IT17', `${res.status}; ${songs.map((s) => `${s.title} – ${s.artist}`).join('; ')}`);

    expect(res.status).toBe(200);
    expect(songs.slice(0, 2).map((s) => s.artist)).toEqual(['Sơn Tùng M-TP', 'Sơn Tùng M-TP']);
  });

  test('IT18: từ khoá không khớp "zzzz" → 200 với danh sách rỗng (không phải 404)', async () => {
    const res = await timKiem('zzzz');
    ghiKetQua('IT18', `${res.status}; songs = ${JSON.stringify(res.body.songs)}; suggestions = ${JSON.stringify(res.body.suggestions)}`);

    expect(res.status).toBe(200);
    expect(res.body.songs).toEqual([]);
    expect(res.body.suggestions).toEqual([]);
  });

  test('IT19: từ khoá rỗng → tối đa 15 bài gợi ý (CSDL có 20 bài)', async () => {
    const res = await timKiem('');
    ghiKetQua('IT19', `${res.status}; số bài trả về: ${res.body.songs?.length} (CSDL có 20 bài)`);

    expect(res.status).toBe(200);
    expect(res.body.songs).toHaveLength(15);
  });
});
