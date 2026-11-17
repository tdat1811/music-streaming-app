import type { Song } from '../data/musicData';

const MULTIPLIERS: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9 };

// Đổi trường "plays" sang số để so sánh: "12.8M" -> 12800000, "2,1M" -> 2100000,
// "850K" -> 850000, "12,345" -> 12345. Không có / không đọc được -> 0.
export const parsePlays = (plays: unknown): number => {
  if (typeof plays === 'number') return Number.isFinite(plays) ? plays : 0;
  if (typeof plays !== 'string') return 0;
  const text = plays.trim().toUpperCase().replace(/\s+/g, '');
  const match = text.match(/^([\d.,]+)([KMB])?/);
  if (!match) return 0;
  const [, digits, suffix] = match;
  // Có hậu tố K/M/B thì dấu phẩy là dấu thập phân ("2,1M"); không có thì là dấu phân cách hàng nghìn
  const numeric = suffix ? digits.replace(',', '.') : digits.replace(/[.,]/g, '');
  const value = parseFloat(numeric);
  if (!Number.isFinite(value)) return 0;
  return value * (suffix ? MULTIPLIERS[suffix] : 1);
};

// Sắp bài hát theo lượt nghe giảm dần; bằng nhau thì giữ thứ tự ban đầu
export const sortByPlays = (songs: Song[]): Song[] =>
  songs
    .map((song, index) => ({ song, index, plays: parsePlays(song.plays) }))
    .sort((a, b) => b.plays - a.plays || a.index - b.index)
    .map((entry) => entry.song);

// Hiển thị số gọn: 12800000 -> "12.8M", 950000 -> "950K", 1500 -> "1.5K", 999 -> "999".
// Nhận cả dữ liệu cũ dạng chuỗi ("12.8M") nhờ parsePlays.
export const formatCount = (value: unknown): string => {
  const n = Math.max(0, Math.round(parsePlays(value)));
  const units: [number, string][] = [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [size, suffix] of units) {
    if (n >= size) {
      const scaled = Math.floor(n / (size / 10)) / 10; // cắt bớt, không làm tròn lên (999999 -> 999.9K)
      return `${Number.isInteger(scaled) ? scaled.toFixed(0) : scaled.toFixed(1)}${suffix}`;
    }
  }
  return String(n);
};

// Số người theo dõi của nghệ sĩ: ưu tiên followersCount (số), dữ liệu cũ dùng chuỗi followers
export const formatFollowers = (artist: { followersCount?: number; followers?: string } | null | undefined): string => {
  if (!artist) return '';
  if (typeof artist.followersCount === 'number') return `${formatCount(artist.followersCount)} Followers`;
  return artist.followers ?? '';
};
