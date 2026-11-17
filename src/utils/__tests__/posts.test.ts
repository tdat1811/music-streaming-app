// Kiểm thử đơn vị: bài đăng của nghệ sĩ trên Feed (sheet UT33)
import { POST_LIMITS, filterPosts, postSubtitle, validatePost } from '../posts';

describe('UT33 – validatePost(content, songId)', () => {
  it.each([
    ['UTCID01', 'Hello fans!', null, null],
    ['UTCID02', '', 's1', null],
    ['UTCID03', '   ', null, 'Write something or attach a song.'],
    ['UTCID04', 'x'.repeat(1000), null, null],
    ['UTCID05', 'x'.repeat(1001), null, 'Post must be at most 1000 characters.'],
  ])('%s: %j + %j → %j', (_ma, content, songId, mongDoi) => {
    expect(validatePost(content, songId)).toBe(mongDoi);
  });

  it('UTCID06: cùng giới hạn với máy chủ (1000 ký tự, 10 bài / ngày)', () => {
    expect(POST_LIMITS).toEqual({ contentMax: 1000, perDay: 10 });
  });
});

describe('UT33 – postSubtitle(post, hasSong)', () => {
  const now = Date.parse('2026-11-16T12:00:00Z');
  it('UTCID07: bài có bài hát, dùng timeAgo sẵn có', () => {
    expect(postSubtitle({ timeAgo: '2h' }, true, now)).toBe('Posted a track  •  2h');
  });
  it('UTCID08: bài chỉ có chữ, tính thời gian từ createdAt, có nhãn edited', () => {
    expect(postSubtitle({ timeAgo: '', createdAt: '2026-11-16T09:00:00Z', editedAt: '2026-11-16T10:00:00Z' }, false, now)).toBe(
      'Shared an update  •  3h · edited'
    );
  });
});

describe('UT33 – filterPosts(posts, opts)', () => {
  const posts = [
    { id: 'p1', authorArtistId: 'a_mer' },
    { id: 'p2', authorArtistId: 'a_weeknd' },
    { id: 'p3', authorArtistId: null },
  ];
  it('UTCID09: For you → tất cả', () => {
    expect(filterPosts(posts, { tab: 'forYou', followedArtistIds: [] }).map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
  });
  it('UTCID10: Following → chỉ nghệ sĩ đang theo dõi', () => {
    expect(filterPosts(posts, { tab: 'following', followedArtistIds: ['a_mer'] }).map((p) => p.id)).toEqual(['p1']);
  });
  it('UTCID11: artistId ưu tiên hơn tab', () => {
    expect(filterPosts(posts, { tab: 'following', followedArtistIds: ['a_mer'], artistId: 'a_weeknd' }).map((p) => p.id)).toEqual(['p2']);
  });
});
