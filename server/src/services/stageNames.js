const Artist = require('../models/Artist');
const ArtistRequest = require('../models/ArtistRequest');
const { stageNameKey } = require('../utils/artistRequestValidation');

// Nghệ danh đã bị dùng chưa: trùng tên một trang nghệ sĩ, hoặc trùng một yêu cầu khác đang chờ.
// So sánh không phân biệt hoa thường / dấu / khoảng trắng.
// options: chuỗi excludeRequestId (cách gọi cũ) hoặc { excludeRequestId, excludeArtistId }
// - excludeRequestId: bỏ qua chính yêu cầu đang xét
// - excludeArtistId: bỏ qua chính trang nghệ sĩ đang đổi tên
const isStageNameTaken = async (stageName, options = {}) => {
  const { excludeRequestId = null, excludeArtistId = null } =
    typeof options === 'string' || options === null ? { excludeRequestId: options } : options;
  const key = stageNameKey(stageName);
  const pending = await ArtistRequest.exists({
    stageNameKey: key,
    status: 'pending',
    ...(excludeRequestId ? { id: { $ne: excludeRequestId } } : {}),
  });
  if (pending) return true;
  // Số trang nghệ sĩ nhỏ nên so trong bộ nhớ (tên trong CSDL chưa có khoá chuẩn hoá)
  const artists = await Artist.find(excludeArtistId ? { id: { $ne: excludeArtistId } } : {}).select('name').lean();
  return artists.some((a) => stageNameKey(a.name) === key);
};

module.exports = { isStageNameTaken };
