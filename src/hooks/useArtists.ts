import { useEffect, useMemo, useState } from 'react';
import { isArtistHidden } from '../data/songRegistry';
import { refreshHiddenContent } from '../services/hiddenContent';
import { useSongRegistryVersion } from './useSongsByIds';
import { Artist, ARTISTS } from '../data/musicData';
import { api } from '../services/api';
import { mapServerArtist, mergeArtists } from '../utils/artists';

// Danh sách nghệ sĩ lần tải gần nhất, dùng chung giữa các màn hình để không bị "nháy" khi mở màn mới
let lastLoaded: Artist[] | null = null;

// Toàn bộ nghệ sĩ: danh sách có sẵn trong app + nghệ sĩ trên máy chủ (gồm nghệ sĩ mới được duyệt).
// Mỗi lần màn hình được mở (hoặc làm mới ứng dụng) sẽ tải lại từ máy chủ; máy chủ tắt thì dùng danh sách có sẵn.
export const useArtists = (): Artist[] => {
  const [artists, setArtists] = useState<Artist[]>(lastLoaded ?? ARTISTS);

  useEffect(() => {
    let alive = true;
    refreshHiddenContent();
    api.artists
      .getAll()
      .then((res: any) => {
        const data = res?.data;
        if (!Array.isArray(data)) return;
        lastLoaded = mergeArtists(ARTISTS, data.map(mapServerArtist));
        if (alive) setArtists(lastLoaded);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Trang nghệ sĩ bị admin ẩn / chủ trang bị khoá: không hiện (kể cả bản có sẵn trong app)
  const version = useSongRegistryVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => artists.filter((a) => !isArtistHidden(a)), [artists, version]);
};
