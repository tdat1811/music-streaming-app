import type { Artist } from '../data/musicData';

// Đổi dữ liệu nghệ sĩ từ máy chủ sang kiểu Artist của app
export const mapServerArtist = (a: any): Artist => ({
  id: a.id,
  name: a.name,
  avatarImage: a.avatarImage || '',
  aboutImage: a.aboutImage || '',
  bio: a.bio || '',
  followersCount: typeof a.followersCount === 'number' ? a.followersCount : undefined,
  followers: typeof a.followers === 'string' ? a.followers : undefined,
  isVerified: a.isVerified,
  isPopular: a.isPopular,
  ownerUserId: a.ownerUserId ?? null,
});

// Gộp danh sách nghệ sĩ có sẵn trong app với danh sách từ máy chủ:
// - cùng id: lấy dữ liệu máy chủ (mới hơn), nhưng giữ ảnh có sẵn nếu máy chủ chưa có ảnh
// - nghệ sĩ chỉ có trên máy chủ (VD vừa được Admin duyệt): thêm vào cuối danh sách
export const mergeArtists = (local: Artist[], server: Artist[]): Artist[] => {
  const byId = new Map<string, Artist>(local.map((a) => [a.id, a]));
  for (const s of server) {
    if (!s?.id || !s.name) continue;
    const l = byId.get(s.id);
    byId.set(
      s.id,
      l
        ? {
            ...l,
            ...Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined)),
            avatarImage: s.avatarImage || l.avatarImage,
            aboutImage: s.aboutImage || l.aboutImage,
          }
        : s
    );
  }
  return [...byId.values()];
};
