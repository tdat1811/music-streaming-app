import type { Song } from '../data/musicData';

// "03:36" | "1:02:10" -> millis. Chuỗi sai định dạng ("abc", "3:xx", "") -> 0 thay vì NaN
const DURATION_PATTERN = /^\d+(:\d+){0,2}$/;
export const parseDuration = (d?: string): number => {
  const text = (d ?? '').trim();
  if (!DURATION_PATTERN.test(text)) return 0;
  const secs = text.split(':').map(Number).reduce((acc, p) => acc * 60 + p, 0);
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

// Nghe bao lâu thì tính 1 lượt nghe: 30 giây, hoặc nửa bài nếu bài ngắn hơn 60 giây
export const PLAY_COUNT_THRESHOLD_SEC = 30;
export const shouldCountPlay = (currentSec: number, durationSec: number): boolean => {
  if (!Number.isFinite(currentSec) || currentSec <= 0) return false;
  const threshold =
    Number.isFinite(durationSec) && durationSec > 0
      ? Math.min(PLAY_COUNT_THRESHOLD_SEC, durationSec / 2)
      : PLAY_COUNT_THRESHOLD_SEC;
  return currentSec >= threshold;
};
