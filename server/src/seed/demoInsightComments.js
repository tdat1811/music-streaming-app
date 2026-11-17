// Bình luận mẫu cho AI Fan Insight (giai đoạn 6, dùng trong `npm run seed`): ~80 bình luận của fan
// dưới bài đăng của Mer Watson trong 25 ngày gần đây, đủ dạng khen / mong muốn / góp ý để demo phân tích.
// Kết quả cố định (không dùng Math.random) nên mỗi lần seed đều giống nhau.

const FANS = [
  'Minh Anh', 'Hoàng Nam', 'Thu Trang', 'Đức Huy', 'Lan Phương', 'Quốc Bảo', 'Ngọc Hân', 'Tuấn Kiệt', 'Mai Linh', 'Gia Bảo',
  'Khánh Vy', 'Thanh Tùng', 'Bảo Ngọc', 'Hải Đăng', 'Phương Thảo', 'Emily R.', 'Daniel K.', 'Sofia M.', 'Kenji T.', 'Lucas P.',
];

const TEXTS = [
  // Khen giọng hát / acoustic (nhiều nhất)
  'Giọng hát của chị ấm quá, nghe mà nổi da gà luôn',
  'Bản này chill thật sự, nghe đi nghe lại không chán',
  'Acoustic như này mới đúng gu mình, cảm ơn chị',
  'Velvet Sky hay quá trời, nghe cả ngày luôn',
  'Your voice gives me chills every single time',
  'Love the acoustic vibe of this one, so warm',
  'Giọng chị nhẹ nhàng mà cảm xúc, yêu lắm',
  'Bài này gắn với kỷ niệm thời sinh viên của mình',
  'Nghe lúc mưa đêm đúng là tuyệt vời',
  'This is the best song on my playlist right now',
  'Tiếng guitar mộc quá đẹp, giọng hát thì khỏi chê',
  'Mỗi lần buồn là mở bài này, thấy nhẹ lòng hẳn',
  'Beautiful lyrics, they really hit different at night',
  'Đỉnh thật sự, mong chị ra thêm nhiều bài như này',
  'Giai điệu dễ thương, nghe một lần là nhớ',
  'Amazing vocals, the bridge is perfect',
  // Mong muốn: bản acoustic / live / MV
  'Chị ơi làm thêm bản acoustic live đi ạ',
  'Mong có buổi live session của bài này quá',
  'Please do a live version of Velvet Sky!',
  'Bao giờ có MV vậy chị, đợi mãi luôn',
  'Hy vọng chị đi tour ở Đà Nẵng, nhất định đi xem',
  'Ra bản piano của bài này được không chị',
  'Would love an unplugged session on the Feed',
  // Góp ý (tiêu cực nhẹ)
  'Đoạn intro hơi nhỏ tiếng, phải tăng âm lượng mới nghe rõ',
  'Phần mở đầu nghe hơi nhỏ so với điệp khúc',
  'The intro is a bit too quiet on my headphones',
  'Bài mới hơi giống bài cũ, mong chị thử phong cách khác',
  // Trung lập / hỏi han
  'Bài này thu ở phòng thu nào vậy chị',
  'Có lời bài hát ở đâu không mọi người',
  'Chị dùng guitar hãng gì vậy ạ',
];

const DAY_MS = 24 * 60 * 60 * 1000;

const buildInsightComments = ({ now = new Date(), postId = 'fp2', count = 80 } = {}) =>
  Array.from({ length: count }, (_, i) => {
    // Phân bố: khen ~55%, mong muốn ~25%, góp ý ~12%, hỏi han ~8%
    const pick = i % 13 < 7 ? i % 16 : i % 13 < 10 ? 16 + (i % 7) : i % 13 < 12 ? 23 + (i % 4) : 27 + (i % 3);
    const fanIndex = (i * 7) % FANS.length;
    const createdAt = new Date(now.getTime() - ((i * 7.3) % 25) * DAY_MS - (i % 9) * 3600 * 1000);
    return {
      id: `c_ins${i + 1}`,
      postId,
      userId: `u_fan${fanIndex + 1}`,
      userName: FANS[fanIndex],
      userAvatar: '',
      text: TEXTS[pick],
      timeAgo: '',
      likes: (i * 5) % 23,
      likedByUserIds: [],
      replies: [],
      createdAt,
      updatedAt: createdAt,
    };
  });

module.exports = { buildInsightComments };
