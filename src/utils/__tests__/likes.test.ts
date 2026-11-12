// Kiểm thử đơn vị: thích / bỏ thích bài đăng, bình luận (sheet UT14)
import { toggleLike } from '../likes';

describe('UT14 – toggleLike(item, userId)', () => {
  it.each([
    ['UTCID01', 'đã thích → bỏ thích', { likes: 5, likedByUserIds: ['u1'] }, 'u1', { likes: 4, likedByUserIds: [] }],
    ['UTCID02', 'người khác thích thêm', { likes: 5, likedByUserIds: ['u1'] }, 'u2', { likes: 6, likedByUserIds: ['u1', 'u2'] }],
    ['UTCID03', 'chưa ai thích → thích', { likes: 0, likedByUserIds: [] }, 'u1', { likes: 1, likedByUserIds: ['u1'] }],
    ['UTCID04', 'dữ liệu lệch, không để số âm', { likes: 0, likedByUserIds: ['u1'] }, 'u1', { likes: 0, likedByUserIds: [] }],
  ])('%s: %s', (_ma, _moTa, item, userId, mongDoi) => {
    const banGoc = JSON.stringify(item);
    const ketQua = toggleLike(item, userId);
    expect(ketQua).toEqual(mongDoi);
    expect(ketQua).not.toBe(item);              // trả object mới
    expect(JSON.stringify(item)).toBe(banGoc);  // object cũ không đổi
  });
});
