import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { ALL_SONGS, getSongsByIds, Song } from '../data/musicData';
import { getRegisteredSong, getRegistryVersion, markSongsUnavailable, registerSongs, subscribeRegistry } from '../data/songRegistry';
import { api } from '../services/api';

const LOCAL_IDS = new Set(ALL_SONGS.map((s) => s.id));
// Đang hỏi máy chủ (tránh gửi trùng yêu cầu cho cùng một bài)
const inFlight = new Set<string>();

// Vẽ lại khi kho bài hát thay đổi
export const useSongRegistryVersion = () => useSyncExternalStore(subscribeRegistry, getRegistryVersion, getRegistryVersion);

// Lấy bài hát theo danh sách id (giữ thứ tự): có ngay bài trong máy / trong kho,
// bài chưa biết thì hỏi máy chủ rồi cập nhật. Bài máy chủ không trả về (bị ẩn / xoá) sẽ bị bỏ ra.
export const useSongsByIds = (ids: string[]): Song[] => {
  const version = useSongRegistryVersion();
  const key = ids.join(',');

  useEffect(() => {
    const missing = ids.filter((id) => id && !LOCAL_IDS.has(id) && !getRegisteredSong(id) && !inFlight.has(id));
    if (!missing.length) return;
    missing.forEach((id) => inFlight.add(id));
    api.songs
      .getByIds(missing)
      .then((res: any) => {
        const found: Song[] = Array.isArray(res?.data) ? res.data : [];
        registerSongs(found);
        const foundIds = new Set(found.map((s) => s.id));
        markSongsUnavailable(missing.filter((id) => !foundIds.has(id)));
      })
      .catch(() => {})
      .finally(() => missing.forEach((id) => inFlight.delete(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getSongsByIds(ids), [key, version]);
};
