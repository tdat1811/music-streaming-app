// Kiểm thử đơn vị: nội dung bài đăng của nghệ sĩ (sheet UT32)
const { validatePostInput, POST_LIMITS } = require('../../src/utils/postValidation');

describe('UT32 – validatePostInput(body)', () => {
  it.each([
    ['UTCID01', { content: 'Hello fans!' }, []],
    ['UTCID02', { songId: 's1' }, []],                                     // chỉ có bài hát
    ['UTCID03', { content: 'New song', songId: 's1' }, []],
    ['UTCID04', { content: '   ' }, ['content']],                          // trống cả hai
    ['UTCID05', {}, ['content']],
    ['UTCID06', { content: 'x'.repeat(1001) }, ['content']],
    ['UTCID07', { content: 'x'.repeat(1000) }, []],                        // đúng 1000 ký tự
    ['UTCID08', { content: 'Hi', songId: '  ' }, []],                      // songId rỗng bị bỏ qua
  ])('%s: %j → lỗi %j', (_ma, body, mongDoi) => {
    expect(Object.keys(validatePostInput(body).errors)).toEqual(mongDoi);
  });

  it('UTCID09: làm sạch – cắt khoảng trắng, songId rỗng thành null', () => {
    expect(validatePostInput({ content: '  Hi  ', songId: '' }).value).toEqual({ content: 'Hi', songId: null });
  });

  it('UTCID10: giới hạn 10 bài / ngày', () => {
    expect(POST_LIMITS.perDay).toBe(10);
  });
});
