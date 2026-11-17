const { GENRES } = require('../config/artistRequest');
const { validateArtistRequest, cleanText } = require('./artistRequestValidation');

// Quy tắc nội dung trong Artist Studio (app có bản tương ứng ở src/utils/studio.ts)
const STUDIO_LIMITS = {
  songTitleMax: 150,
  descriptionMax: 1000,
  albumTitleMax: 100,
  albumSongsMax: 30,
  minYear: 1900,
};

// Ảnh đã tải qua POST /api/studio/images (hoặc ảnh đại diện lúc đăng ký nghệ sĩ)
const IMAGE_PATH = /^\/(covers|avatars)\/[\w-]+\.(jpg|jpeg|png|webp)$/i;

// Thể loại của bài: thuộc danh sách chung, và thuộc thể loại của nghệ sĩ (nếu nghệ sĩ đã khai báo)
const allowedGenres = (artistGenres) => (Array.isArray(artistGenres) && artistGenres.length ? artistGenres : GENRES);

// Thông tin bài hát khi tải lên / sửa. partial = true: chỉ kiểm tra các trường được gửi (khi sửa)
const validateSongFields = (body = {}, artistGenres = [], { partial = false } = {}) => {
  const errors = {};
  const value = {};
  const has = (k) => !partial || body[k] !== undefined;

  if (has('title')) {
    const title = cleanText(body.title);
    if (!title) errors.title = 'Please enter a song title.';
    else if (title.length > STUDIO_LIMITS.songTitleMax) errors.title = `Title must be at most ${STUDIO_LIMITS.songTitleMax} characters.`;
    value.title = title;
  }
  if (has('genre')) {
    const genre = typeof body.genre === 'string' ? body.genre : '';
    if (!genre) errors.genre = 'Please choose a genre.';
    else if (!allowedGenres(artistGenres).includes(genre)) errors.genre = 'Please choose one of your genres.';
    value.genre = genre;
  }
  if (body.description !== undefined) {
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (description.length > STUDIO_LIMITS.descriptionMax) errors.description = `Description must be at most ${STUDIO_LIMITS.descriptionMax} characters.`;
    value.description = description;
  }
  if (body.coverImage !== undefined) {
    const coverImage = cleanText(body.coverImage);
    if (coverImage && !IMAGE_PATH.test(coverImage)) errors.coverImage = 'Invalid cover image.';
    value.coverImage = coverImage;
  }
  return { errors, value };
};

// Album: tên, năm phát hành, danh sách id bài (thứ tự giữ nguyên, không trùng)
const validateAlbumFields = (body = {}, now = new Date()) => {
  const errors = {};
  const title = cleanText(body.title);
  if (!title) errors.title = 'Please enter an album title.';
  else if (title.length > STUDIO_LIMITS.albumTitleMax) errors.title = `Title must be at most ${STUDIO_LIMITS.albumTitleMax} characters.`;

  const year = String(body.releaseYear ?? '').trim();
  const maxYear = now.getFullYear() + 1;
  if (!/^\d{4}$/.test(year) || Number(year) < STUDIO_LIMITS.minYear || Number(year) > maxYear) {
    errors.releaseYear = `Release year must be between ${STUDIO_LIMITS.minYear} and ${maxYear}.`;
  }

  const raw = Array.isArray(body.songIds) ? body.songIds : [];
  const songIds = [...new Set(raw.filter((id) => typeof id === 'string' && id))];
  if (raw.length !== songIds.length) errors.songIds = 'A song can only appear once in an album.';
  else if (songIds.length > STUDIO_LIMITS.albumSongsMax) errors.songIds = `An album can have at most ${STUDIO_LIMITS.albumSongsMax} songs.`;

  const coverImage = cleanText(body.coverImage);
  if (coverImage && !IMAGE_PATH.test(coverImage)) errors.coverImage = 'Invalid cover image.';

  return { errors, value: { title, releaseYear: year, songIds, coverImage } };
};

// Trang nghệ sĩ: cùng quy tắc với form đăng ký nghệ sĩ (nghệ danh, thể loại, tiểu sử, link) + 2 ảnh
const validateArtistPage = (body = {}) => {
  const { errors, value } = validateArtistRequest({ ...body, agree: true, avatarImage: '' });
  delete errors.avatarImage;
  const result = { stageName: value.stageName, genres: value.genres, bio: value.bio, socialLinks: value.socialLinks };
  for (const key of ['avatarImage', 'aboutImage']) {
    if (body[key] === undefined) continue;
    const img = cleanText(body[key]);
    if (img && !IMAGE_PATH.test(img)) errors[key] = 'Invalid image.';
    result[key] = img;
  }
  return { errors, value: result };
};

// Đổi trạng thái bài hát. Trả về thông báo lỗi hoặc null nếu hợp lệ.
// Bài đã có lượt nghe không quay về "draft" được (nháp = chưa phát hành), chỉ ẩn được.
const SONG_STATUSES_FOR_ARTIST = ['draft', 'published', 'hidden'];
const checkStatusChange = (song, nextStatus) => {
  if (!SONG_STATUSES_FOR_ARTIST.includes(nextStatus)) return 'Status must be draft, published or hidden.';
  if (nextStatus === 'draft' && (song.plays || 0) > 0) return 'This song already has plays. Hide it instead of moving it back to draft.';
  return null;
};

// Chỉ xoá hẳn được bài chưa có lượt nghe
const canDeleteSong = (song) => (song.plays || 0) === 0;

module.exports = {
  STUDIO_LIMITS,
  IMAGE_PATH,
  validateSongFields,
  validateAlbumFields,
  validateArtistPage,
  checkStatusChange,
  canDeleteSong,
};
