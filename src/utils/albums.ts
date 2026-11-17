import type { Album } from '../data/musicData';

// Đổi album từ máy chủ sang kiểu Album của app (artistId luôn có để biết đây là album máy chủ)
export const mapServerAlbum = (a: any): Album => ({
  id: a.id,
  title: a.title,
  artist: a.artist,
  artistId: a.artistId ?? null,
  coverImage: a.coverImage || '',
  songIds: Array.isArray(a.songIds) ? a.songIds : [],
  releaseYear: a.releaseYear,
  isTrending: a.isTrending,
});

// Gộp album có sẵn trong app với album trên máy chủ:
// cùng id -> lấy dữ liệu máy chủ (giữ ảnh có sẵn nếu máy chủ chưa có ảnh); album chỉ có trên máy chủ -> thêm vào cuối
export const mergeAlbums = (local: Album[], server: Album[]): Album[] => {
  const byId = new Map<string, Album>(local.map((a) => [a.id, a]));
  for (const s of server) {
    if (!s?.id || !s.title) continue;
    const l = byId.get(s.id);
    byId.set(s.id, l ? { ...l, ...s, coverImage: s.coverImage || l.coverImage } : s);
  }
  return [...byId.values()];
};
