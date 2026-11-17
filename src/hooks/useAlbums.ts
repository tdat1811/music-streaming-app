import { useEffect, useMemo, useState } from 'react';
import { isArtistHidden } from '../data/songRegistry';
import { useSongRegistryVersion } from './useSongsByIds';
import { Album, ALL_ALBUMS } from '../data/musicData';
import { api } from '../services/api';
import { mapServerAlbum, mergeAlbums } from '../utils/albums';

// Danh sách album lần tải gần nhất, dùng chung giữa các màn hình
let lastLoaded: Album[] | null = null;

// Toàn bộ album: album có sẵn trong app + album công khai trên máy chủ (gồm album nghệ sĩ tạo).
// Mỗi lần màn hình được mở sẽ tải lại; máy chủ tắt thì dùng danh sách có sẵn.
export const useAlbums = (): Album[] => {
  const [albums, setAlbums] = useState<Album[]>(lastLoaded ?? ALL_ALBUMS);

  useEffect(() => {
    let alive = true;
    api.albums
      .getAll()
      .then((res: any) => {
        const data = res?.data;
        if (!Array.isArray(data)) return;
        lastLoaded = mergeAlbums(ALL_ALBUMS, data.map(mapServerAlbum));
        if (alive) setAlbums(lastLoaded);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Album của trang nghệ sĩ đang bị ẩn cũng ẩn theo
  const version = useSongRegistryVersion();
  return useMemo(
    () => albums.filter((a: any) => !isArtistHidden({ id: a.artistId, name: a.artist })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [albums, version]
  );
};
