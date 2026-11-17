// Quy tắc đăng ký làm nghệ sĩ (dùng chung cho validate ở server; app có bản tương ứng
// ở src/utils/artistRequest.ts – sửa ở đây thì sửa cả bên đó)

const GENRES = ['Pop', 'Ballad', 'R&B', 'Rap', 'Indie', 'EDM', 'Lo-fi', 'Rock', 'Acoustic', 'Jazz'];

const LIMITS = {
  stageNameMin: 2,
  stageNameMax: 50,
  genresMin: 1,
  genresMax: 3,
  bioMin: 20,
  bioMax: 500,
  socialLinksMax: 3,
  socialLinkMax: 200,
  rejectNoteMax: 500,
};

// Lý do từ chối (mã -> nội dung hiển thị cho người dùng)
const REJECT_REASONS = {
  stage_name_inappropriate: 'Stage name not appropriate',
  incomplete_info: 'Incomplete information',
  inappropriate_content: 'Inappropriate content in bio or photo',
  other: 'Other',
};

const REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

module.exports = { GENRES, LIMITS, REJECT_REASONS, REQUEST_STATUSES };
