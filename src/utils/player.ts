import type { Song } from '../data/musicData';

// "03:36" | "1:02:10" -> millis
export const parseDuration = (d?: string): number => {
  if (!d) return 0;
  const secs = d.split(':').map(Number).reduce((acc, p) => acc * 60 + p, 0);
  return secs * 1000;
};

// Xáo trộn (Fisher–Yates), trả mảng mới, không sửa mảng đầu vào
export const shuffleTracks = (tracks: Song[]): Song[] => {
  const result = [...tracks];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
