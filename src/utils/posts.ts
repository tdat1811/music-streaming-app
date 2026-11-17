// Quy tắc bài đăng của nghệ sĩ ở app (cùng quy tắc với server/src/utils/postValidation.js)
import { timeAgo } from './time';

export const POST_LIMITS = { contentMax: 1000, perDay: 10 };

// null = hợp lệ; ngược lại là thông báo lỗi
export const validatePost = (content: string, songId: string | null | undefined): string | null => {
  const text = content.trim();
  if (!text && !songId) return 'Write something or attach a song.';
  if (text.length > POST_LIMITS.contentMax) return `Post must be at most ${POST_LIMITS.contentMax} characters.`;
  return null;
};

// Dòng phụ dưới tên tác giả: "Posted a track • 2h · edited" / "Shared an update • 3d"
export const postSubtitle = (
  post: { timeAgo?: string; createdAt?: string; editedAt?: string | null },
  hasSong: boolean,
  now: number = Date.now()
): string => {
  const when = post.timeAgo || timeAgo(post.createdAt, now);
  return `${hasSong ? 'Posted a track' : 'Shared an update'}${when ? `  •  ${when}` : ''}${post.editedAt ? ' · edited' : ''}`;
};

// Lọc bài theo tab / nghệ sĩ: artistId (My posts / trang nghệ sĩ) ưu tiên hơn tab Following
export const filterPosts = <T extends { authorArtistId?: string | null }>(
  posts: T[],
  opts: { tab: 'forYou' | 'following'; followedArtistIds: string[]; artistId?: string | null }
): T[] => {
  if (opts.artistId) return posts.filter((p) => p.authorArtistId === opts.artistId);
  if (opts.tab === 'following') return posts.filter((p) => !!p.authorArtistId && opts.followedArtistIds.includes(p.authorArtistId));
  return posts;
};
