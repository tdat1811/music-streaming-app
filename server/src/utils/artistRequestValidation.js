const { GENRES, LIMITS, REJECT_REASONS } = require('../config/artistRequest');
const { normalizeName } = require('./legacyData');

// Link mạng xã hội: có tên miền (vd instagram.com/abc), không chứa khoảng trắng, không phải javascript:
const LINK_PATTERN = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;
// Ảnh đại diện chỉ nhận đường dẫn do API tải ảnh trả về
const AVATAR_PATTERN = /^\/avatars\/[\w-]+\.(jpg|jpeg|png|webp)$/i;

// Gom khoảng trắng thừa: "  Lan   Ng.  " -> "Lan Ng."
const cleanText = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

// Khoá so trùng nghệ danh: không phân biệt hoa thường, dấu, khoảng trắng
const stageNameKey = (name) => normalizeName(name);

// Kiểm tra form đăng ký nghệ sĩ. Trả về { errors, value }:
// errors rỗng = hợp lệ; value là dữ liệu đã làm sạch để lưu.
const validateArtistRequest = (body = {}) => {
  const errors = {};

  const stageName = cleanText(body.stageName);
  if (!stageName) errors.stageName = 'Please enter your stage name.';
  else if (stageName.length < LIMITS.stageNameMin || stageName.length > LIMITS.stageNameMax) {
    errors.stageName = `Stage name must be ${LIMITS.stageNameMin}–${LIMITS.stageNameMax} characters.`;
  } else if (!/[\p{L}\p{N}]/u.test(stageName)) {
    errors.stageName = 'Stage name must contain letters or numbers.';
  }

  const rawGenres = Array.isArray(body.genres) ? body.genres : [];
  const genres = [...new Set(rawGenres.filter((g) => typeof g === 'string'))];
  if (genres.length < LIMITS.genresMin || genres.length > LIMITS.genresMax) {
    errors.genres = `Choose ${LIMITS.genresMin}–${LIMITS.genresMax} genres.`;
  } else if (genres.some((g) => !GENRES.includes(g))) {
    errors.genres = 'Unknown genre.';
  }

  const bio = typeof body.bio === 'string' ? body.bio.trim() : '';
  if (bio.length < LIMITS.bioMin) errors.bio = `Bio must be at least ${LIMITS.bioMin} characters.`;
  else if (bio.length > LIMITS.bioMax) errors.bio = `Bio must be at most ${LIMITS.bioMax} characters.`;

  const rawLinks = Array.isArray(body.socialLinks) ? body.socialLinks : [];
  const socialLinks = [...new Set(rawLinks.map(cleanText).filter(Boolean))];
  if (socialLinks.length > LIMITS.socialLinksMax) {
    errors.socialLinks = `Add at most ${LIMITS.socialLinksMax} links.`;
  } else if (socialLinks.some((l) => l.length > LIMITS.socialLinkMax || !LINK_PATTERN.test(l))) {
    errors.socialLinks = 'Please enter valid links (e.g. instagram.com/yourname).';
  }

  const avatarImage = cleanText(body.avatarImage);
  if (avatarImage && !AVATAR_PATTERN.test(avatarImage)) errors.avatarImage = 'Invalid profile photo.';

  if (body.agree !== true) errors.agree = 'Please confirm the statement before submitting.';

  return { errors, value: { stageName, genres, bio, socialLinks, avatarImage } };
};

// Kiểm tra lý do từ chối của Admin
const validateRejection = (body = {}) => {
  const errors = {};
  const reason = body.reason;
  if (!Object.prototype.hasOwnProperty.call(REJECT_REASONS, reason)) errors.reason = 'Please choose a reason.';
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (reason === 'other' && !note) errors.note = 'Please add a note when choosing "Other".';
  if (note.length > LIMITS.rejectNoteMax) errors.note = `Note must be at most ${LIMITS.rejectNoteMax} characters.`;
  return { errors, value: { reason, note } };
};

module.exports = { validateArtistRequest, validateRejection, stageNameKey, cleanText, LINK_PATTERN };
