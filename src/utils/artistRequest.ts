// Quy tắc đăng ký làm nghệ sĩ ở app (cùng quy tắc với server/src/config/artistRequest.js và
// server/src/utils/artistRequestValidation.js – sửa bên này thì sửa cả bên kia)

export const ARTIST_GENRES = ['Pop', 'Ballad', 'R&B', 'Rap', 'Indie', 'EDM', 'Lo-fi', 'Rock', 'Acoustic', 'Jazz'];

export const ARTIST_LIMITS = {
  stageNameMin: 2,
  stageNameMax: 50,
  genresMin: 1,
  genresMax: 3,
  bioMin: 20,
  bioMax: 500,
  socialLinksMax: 3,
  socialLinkMax: 200,
  rejectNoteMax: 500,
  avatarMaxBytes: 5 * 1024 * 1024,
};

export const REJECT_REASONS: { code: string; label: string }[] = [
  { code: 'stage_name_inappropriate', label: 'Stage name not appropriate' },
  { code: 'incomplete_info', label: 'Incomplete information' },
  { code: 'inappropriate_content', label: 'Inappropriate content in bio or photo' },
  { code: 'other', label: 'Other (note required)' },
];

export type ArtistRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ArtistRequestForm {
  stageName: string;
  genres: string[];
  bio: string;
  socialLinks: string[];
  // Đường dẫn ảnh trên máy chủ (/avatars/...), rỗng nếu không chọn ảnh
  avatarImage: string;
}

export interface ArtistRequestData extends ArtistRequestForm {
  id: string;
  userId: string;
  status: ArtistRequestStatus;
  rejectReason: string | null;
  rejectReasonText: string;
  rejectNote: string;
  reviewedAt: string | null;
  createdAt: string;
  createdArtistId: string | null;
  verified?: boolean;
  applicant?: { id?: string; name: string; email: string; role?: string; memberSince?: string } | null;
  previousRequests?: number;
  nameAvailable?: boolean;
}

export const EMPTY_ARTIST_FORM: ArtistRequestForm = { stageName: '', genres: [], bio: '', socialLinks: [''], avatarImage: '' };

const LINK_PATTERN = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;

// Gom khoảng trắng thừa: "  Lan   Ng.  " -> "Lan Ng."
export const cleanText = (value: string) => value.replace(/\s+/g, ' ').trim();

// Bỏ link rỗng / trùng
export const cleanSocialLinks = (links: string[]) => [...new Set(links.map(cleanText).filter(Boolean))];

export type ArtistFormErrors = Partial<Record<'stageName' | 'genres' | 'bio' | 'socialLinks', string>>;

// Kiểm tra bước 1 (hồ sơ nghệ sĩ). Rỗng = hợp lệ.
export const validateArtistProfile = (form: ArtistRequestForm): ArtistFormErrors => {
  const errors: ArtistFormErrors = {};
  const L = ARTIST_LIMITS;

  const stageName = cleanText(form.stageName);
  if (!stageName) errors.stageName = 'Please enter your stage name.';
  else if (stageName.length < L.stageNameMin || stageName.length > L.stageNameMax) {
    errors.stageName = `Stage name must be ${L.stageNameMin}–${L.stageNameMax} characters.`;
  } else if (!/[\p{L}\p{N}]/u.test(stageName)) {
    errors.stageName = 'Stage name must contain letters or numbers.';
  }

  const genres = [...new Set(form.genres)];
  if (genres.length < L.genresMin || genres.length > L.genresMax) {
    errors.genres = `Choose ${L.genresMin}–${L.genresMax} genres.`;
  } else if (genres.some((g) => !ARTIST_GENRES.includes(g))) {
    errors.genres = 'Unknown genre.';
  }

  const bio = form.bio.trim();
  if (bio.length < L.bioMin) errors.bio = `Bio must be at least ${L.bioMin} characters.`;
  else if (bio.length > L.bioMax) errors.bio = `Bio must be at most ${L.bioMax} characters.`;

  const links = cleanSocialLinks(form.socialLinks);
  if (links.length > L.socialLinksMax) errors.socialLinks = `Add at most ${L.socialLinksMax} links.`;
  else if (links.some((l) => l.length > L.socialLinkMax || !LINK_PATTERN.test(l))) {
    errors.socialLinks = 'Please enter valid links (e.g. instagram.com/yourname).';
  }

  return errors;
};

// Bật / tắt một thể loại, không quá số lượng cho phép
export const toggleGenre = (genres: string[], genre: string): string[] => {
  if (genres.includes(genre)) return genres.filter((g) => g !== genre);
  if (genres.length >= ARTIST_LIMITS.genresMax) return genres;
  return [...genres, genre];
};

// Kiểm tra form từ chối của Admin. null = hợp lệ, ngược lại là thông báo lỗi
export const validateRejectForm = (reason: string | null, note: string): string | null => {
  if (!reason || !REJECT_REASONS.some((r) => r.code === reason)) return 'Please choose a reason.';
  if (reason === 'other' && !note.trim()) return 'Please add a note when choosing "Other".';
  if (note.trim().length > ARTIST_LIMITS.rejectNoteMax) return `Note must be at most ${ARTIST_LIMITS.rejectNoteMax} characters.`;
  return null;
};

// Chữ cái đầu để làm ảnh đại diện tạm: "Lan Ng." -> "LN"
export const initials = (name: string) =>
  cleanText(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';
