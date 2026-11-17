const ArtistRequest = require('../models/ArtistRequest');
const User = require('../models/User');
const { makeId } = require('../utils/ids');
const { validateArtistRequest, stageNameKey } = require('../utils/artistRequestValidation');
const { isStageNameTaken } = require('../services/stageNames');
const { REJECT_REASONS } = require('../config/artistRequest');

// API cho người nghe đăng ký làm nghệ sĩ (route /api/artist-requests, cần đăng nhập).

// Dữ liệu trả về app: thêm nội dung lý do từ chối để hiển thị
const toResponse = (request) => {
  if (!request) return null;
  const obj = request.toObject ? request.toObject() : request;
  delete obj._id;
  delete obj.__v;
  delete obj.stageNameKey;
  return { ...obj, rejectReasonText: obj.rejectReason ? REJECT_REASONS[obj.rejectReason] : '' };
};

// Gửi yêu cầu
exports.createRequest = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.userId }).select('id role');
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    if (user.role !== 'listener') {
      return res.status(403).json({ success: false, code: 'NOT_LISTENER', message: 'Tài khoản này đã là nghệ sĩ hoặc quản trị viên.' });
    }

    const { errors, value } = validateArtistRequest(req.body);
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, code: 'INVALID', message: Object.values(errors)[0], errors });
    }

    if (await ArtistRequest.exists({ userId: user.id, status: 'pending' })) {
      return res.status(409).json({ success: false, code: 'PENDING_EXISTS', message: 'Bạn đã có một yêu cầu đang chờ duyệt.' });
    }
    if (await isStageNameTaken(value.stageName)) {
      return res.status(409).json({
        success: false,
        code: 'NAME_TAKEN',
        message: `"${value.stageName}" is already used by another artist. Please choose a different stage name.`,
      });
    }

    const request = await ArtistRequest.create({
      id: makeId('ar'),
      userId: user.id,
      ...value,
      stageNameKey: stageNameKey(value.stageName),
      status: 'pending',
    });
    res.status(201).json({ success: true, message: 'Đã gửi yêu cầu.', data: toResponse(request) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Yêu cầu gần nhất của tôi (mọi trạng thái); chưa từng gửi -> data = null
exports.getMyRequest = async (req, res) => {
  try {
    const request = await ArtistRequest.findOne({ userId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: toResponse(request) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Huỷ yêu cầu đang chờ
exports.cancelMyRequest = async (req, res) => {
  try {
    const request = await ArtistRequest.findOneAndUpdate(
      { userId: req.userId, status: 'pending' },
      { status: 'cancelled', cancelledAt: new Date() },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: 'Không có yêu cầu nào đang chờ để huỷ.' });
    res.status(200).json({ success: true, message: 'Đã huỷ yêu cầu.', data: toResponse(request) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Tải ảnh đại diện cho hồ sơ nghệ sĩ -> trả đường dẫn để gửi kèm yêu cầu
exports.uploadAvatar = (req, res) => {
  res.status(201).json({ success: true, avatarImage: `/avatars/${req.file.filename}` });
};

exports.toResponse = toResponse;
