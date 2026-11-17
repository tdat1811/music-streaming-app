// Quy tắc trong Artist Studio ở app (cùng quy tắc với server/src/utils/studioValidation.js)
import { ARTIST_GENRES } from './artistRequest';

export const STUDIO_LIMITS = {
  songTitleMax: 150,
  descriptionMax: 1000,
  albumTitleMax: 100,
  albumSongsMax: 30,
  minYear: 1900,
  audioMaxBytes: 20 * 1024 * 1024,
  imageMaxBytes: 5 * 1024 * 1024,
};

export const AUDIO_EXTENSIONS = ['mp3', 'm4a'];

export type SongStatus = 'published' | 'draft' | 'hidden';

export interface StudioSong {
  id: string;
  title: string;
  artist: string;
  artistId?: string | null;
  status: SongStatus;
  plays: number;
  duration?: string;
  coverImage?: string;
  audioUrl?: string;
  genre?: string;
  description?: string;
  createdAt?: string;
  // Giai đoạn 5: bị admin gỡ vì vi phạm (không đổi trạng thái / xoá được nữa)
  removedAt?: string | null;
  removedRule?: string;
  suspendedAt?: string | null;
}

export interface StudioAlbum {
  id: string;
  title: string;
  releaseYear: string;
  coverImage?: string;
  songIds: string[];
  status: 'published' | 'draft';
  publishedSongCount?: number;
  songs?: StudioSong[];
}

// Thể loại được chọn cho bài hát: thể loại của nghệ sĩ, chưa khai báo thì dùng danh sách chung
export const songGenreOptions = (artistGenres?: string[] | null) =>
  artistGenres && artistGenres.length ? artistGenres : ARTIST_GENRES;

// Kiểm tra file nhạc chọn để tải lên. null = hợp lệ
export const validateAudioFile = (file: { name?: string | null; size?: number | null } | null): string | null => {
  if (!file?.name) return 'Please choose an audio file.';
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!AUDIO_EXTENSIONS.includes(ext)) return `"${file.name}" is not supported. Please choose an MP3 or M4A file.`;
  if (file.size && file.size > STUDIO_LIMITS.audioMaxBytes) return 'This file is larger than 20 MB.';
  return null;
};

export type SongFormErrors = Partial<Record<'title' | 'genre' | 'description', string>>;

export const validateSongForm = (form: { title: string; genre: string; description?: string }, genres: string[]): SongFormErrors => {
  const errors: SongFormErrors = {};
  const title = form.title.replace(/\s+/g, ' ').trim();
  if (!title) errors.title = 'Please enter a song title.';
  else if (title.length > STUDIO_LIMITS.songTitleMax) errors.title = `Title must be at most ${STUDIO_LIMITS.songTitleMax} characters.`;
  if (!form.genre) errors.genre = 'Please choose a genre.';
  else if (!genres.includes(form.genre)) errors.genre = 'Please choose one of your genres.';
  if ((form.description ?? '').trim().length > STUDIO_LIMITS.descriptionMax) {
    errors.description = `Description must be at most ${STUDIO_LIMITS.descriptionMax} characters.`;
  }
  return errors;
};

export type AlbumFormErrors = Partial<Record<'title' | 'releaseYear' | 'songIds', string>>;

export const validateAlbumForm = (
  form: { title: string; releaseYear: string; songIds: string[] },
  publish: boolean,
  songsById: Record<string, StudioSong>,
  now: Date = new Date()
): AlbumFormErrors => {
  const errors: AlbumFormErrors = {};
  const title = form.title.replace(/\s+/g, ' ').trim();
  if (!title) errors.title = 'Please enter an album title.';
  else if (title.length > STUDIO_LIMITS.albumTitleMax) errors.title = `Title must be at most ${STUDIO_LIMITS.albumTitleMax} characters.`;
  const maxYear = now.getFullYear() + 1;
  const y = form.releaseYear.trim();
  if (!/^\d{4}$/.test(y) || Number(y) < STUDIO_LIMITS.minYear || Number(y) > maxYear) {
    errors.releaseYear = `Release year must be between ${STUDIO_LIMITS.minYear} and ${maxYear}.`;
  }
  if (form.songIds.length > STUDIO_LIMITS.albumSongsMax) errors.songIds = `An album can have at most ${STUDIO_LIMITS.albumSongsMax} songs.`;
  else if (publish && !form.songIds.some((id) => songsById[id]?.status === 'published')) {
    errors.songIds = 'An album needs at least one published song before it can be published.';
  }
  return errors;
};

// Bài đã có lượt nghe thì chỉ ẩn được, không xoá
export const canDeleteSong = (song: Pick<StudioSong, 'plays'>) => (song.plays || 0) === 0;

export type SongAction = 'play' | 'edit' | 'publish' | 'hide' | 'show' | 'delete';

// Các thao tác trong menu "⋯" của một bài (S5), tuỳ trạng thái
export const songActions = (song: Pick<StudioSong, 'status'> & { removedAt?: string | null }): SongAction[] => {
  // Bài bị admin gỡ: không còn thao tác nào (giai đoạn 5)
  if (song.removedAt) return [];
  const byStatus: Record<SongStatus, SongAction[]> = {
    published: ['play', 'edit', 'hide', 'delete'],
    draft: ['play', 'edit', 'publish', 'delete'],
    hidden: ['play', 'edit', 'show', 'delete'],
  };
  return byStatus[song.status] ?? byStatus.published;
};

// Trạng thái mới khi chọn thao tác
export const statusForAction = (action: SongAction): SongStatus | null =>
  action === 'publish' || action === 'show' ? 'published' : action === 'hide' ? 'hidden' : null;

// Đổi chỗ 2 bài trong album (nút ↑ ↓); ra ngoài danh sách thì giữ nguyên
export const moveItem = <T,>(list: T[], index: number, delta: -1 | 1): T[] => {
  const target = index + delta;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
