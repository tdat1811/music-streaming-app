import type { Song } from './musicData';

// Kho bài hát lấy từ máy chủ (VD bài nghệ sĩ tải lên), dùng chung cho cả app.
// getSongsByIds (musicData.ts) tra kho này trước rồi mới tới dữ liệu có sẵn trong app,
// nên playlist, bài đã thích, bảng tin... đều thấy được bài mới.

const songs = new Map<string, Song>();
// Bài máy chủ báo không còn công khai (bị ẩn / xoá): không hiển thị nữa
const unavailable = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

// Giai đoạn 5: trang nghệ sĩ / bài hát đang bị ẩn theo máy chủ (admin ẩn, chủ trang bị khoá, bài bị gỡ).
// Thay toàn bộ mỗi lần tải lại để trang được hiện lại thì cũng hiện lại trên app.
let hiddenSongs = new Set<string>();
let hiddenArtistIds = new Set<string>();
let hiddenArtistNames = new Set<string>();
const normName = (name: string) => name.trim().toLowerCase();

const notify = () => {
  version += 1;
  listeners.forEach((fn) => fn());
};

export const registerSongs = (list: Song[]) => {
  let changed = false;
  for (const song of list) {
    if (!song?.id) continue;
    songs.set(song.id, song);
    if (unavailable.delete(song.id)) changed = true;
    changed = true;
  }
  if (changed) notify();
};

export const markSongsUnavailable = (ids: string[]) => {
  let changed = false;
  for (const id of ids) {
    if (!unavailable.has(id)) {
      unavailable.add(id);
      songs.delete(id);
      changed = true;
    }
  }
  if (changed) notify();
};

export const setModerationHidden = (data: { songIds: string[]; artists: { id: string; name: string }[] }) => {
  hiddenSongs = new Set(data.songIds);
  hiddenArtistIds = new Set(data.artists.map((a) => a.id));
  hiddenArtistNames = new Set(data.artists.map((a) => normName(a.name || '')));
  notify();
};

// Nghệ sĩ đang bị ẩn (theo id, hoặc theo tên với dữ liệu mẫu cũ chưa có id)
export const isArtistHidden = (artist: { id?: string | null; name?: string | null } | null | undefined) =>
  !!artist && ((!!artist.id && hiddenArtistIds.has(artist.id)) || (!!artist.name && hiddenArtistNames.has(normName(artist.name))));

export const getRegisteredSong = (id: string): Song | undefined => songs.get(id);
export const isSongUnavailable = (id: string) => unavailable.has(id) || hiddenSongs.has(id);
export const getRegistryVersion = () => version;

export const subscribeRegistry = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

// Chỉ dùng trong kiểm thử
export const resetSongRegistry = () => {
  songs.clear();
  unavailable.clear();
  hiddenSongs = new Set();
  hiddenArtistIds = new Set();
  hiddenArtistNames = new Set();
  version = 0;
};
