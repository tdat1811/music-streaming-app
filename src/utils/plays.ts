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
