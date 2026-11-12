import { useEffect, useMemo, useState } from 'react';
import { ALL_SONGS, Song } from '../data/musicData';
import { api } from '../services/api';
import { fuzzySearch } from '../utils/fuzzySearch';

const DEBOUNCE_MS = 250;

// Danh sách bài hát trên máy, bỏ bài trùng tên + ca sĩ
const LOCAL_SONGS = ALL_SONGS.filter(
  (song, index, self) =>
    index === self.findIndex((s) => s.title === song.title && s.artist === song.artist)
);

// Tìm bài hát tương đối trong toàn bộ kho nhạc: ưu tiên kết quả của máy chủ (đã xếp hạng),
// máy chủ tắt thì tìm trên dữ liệu trong máy. Từ khoá rỗng -> danh sách rỗng.
export const useSongSearch = (query: string): Song[] => {
  const q = query.trim();
  // null = chưa có / không lấy được kết quả máy chủ cho từ khoá hiện tại
  const [serverResult, setServerResult] = useState<{ query: string; songs: Song[] } | null>(null);

  useEffect(() => {
    if (!q) return;
    let active = true;
    const timer = setTimeout(() => {
      api.songs
        .search(q)
        .then((res: any) => {
          if (active && Array.isArray(res?.songs)) setServerResult({ query: q, songs: res.songs });
        })
        .catch(() => {
          if (active) setServerResult(null);
        });
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q]);

  return useMemo(() => {
    if (!q) return [];
    // Chỉ dùng kết quả máy chủ nếu đúng là của từ khoá đang gõ, tránh hiện kết quả cũ
    if (serverResult && serverResult.query === q) return serverResult.songs;
    return fuzzySearch(LOCAL_SONGS, q, (song) => [song.title, song.artist]);
  }, [q, serverResult]);
};
