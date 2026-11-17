import { api } from './api';
import { setModerationHidden } from '../data/songRegistry';

// Tải danh sách trang nghệ sĩ / bài hát đang bị ẩn (giai đoạn 5) để lọc cả dữ liệu mẫu có sẵn trong app.
// Gọi khi mở app, khi làm mới, và mỗi lần tải danh sách nghệ sĩ. Gộp các lần gọi trùng nhau.
let inFlight: Promise<void> | null = null;

export const refreshHiddenContent = (): Promise<void> => {
  if (inFlight) return inFlight;
  inFlight = api.moderation
    .hidden()
    .then((res: any) => {
      const d = res?.data;
      if (d && Array.isArray(d.songIds) && Array.isArray(d.artists)) setModerationHidden(d);
    })
    .catch(() => {
      // Máy chủ tắt: giữ danh sách lần trước
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
};
