// Quy tắc bài đăng của nghệ sĩ trên Feed (app có bản tương ứng ở src/utils/posts.ts)

const POST_LIMITS = {
  contentMax: 1000,
  perDay: 10,
};

// Kiểm tra nội dung bài đăng: chữ (tối đa 1000 ký tự) và/hoặc 1 bài hát; không được trống cả hai.
// Trả về { errors, value }; việc kiểm tra bài hát có thuộc nghệ sĩ không do controller làm.
const validatePostInput = (body = {}) => {
  const errors = {};
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const songId = typeof body.songId === 'string' && body.songId.trim() ? body.songId.trim() : null;
  if (content.length > POST_LIMITS.contentMax) errors.content = `Post must be at most ${POST_LIMITS.contentMax} characters.`;
  if (!content && !songId) errors.content = 'Write something or attach a song.';
  return { errors, value: { content, songId } };
};

module.exports = { POST_LIMITS, validatePostInput };
