const ArtistRequest = require('../models/ArtistRequest');
const Artist = require('../models/Artist');
const User = require('../models/User');
const Song = require('../models/Song');
const Notification = require('../models/Notification');
const { makeId, escapeRegex } = require('../utils/ids');
const { validateRejection } = require('../utils/artistRequestValidation');
const { isStageNameTaken } = require('../services/stageNames');
const { REJECT_REASONS, REQUEST_STATUSES } = require('../config/artistRequest');
const { toResponse } = require('./artistRequestController');
const { PUBLIC_SONG_FILTER } = Song;
const Report = require('../models/Report');
const Violation = require('../models/Violation');
const AdminAction = require('../models/AdminAction');
const { MAX_VIOLATIONS, ruleLabel } = require('../config/moderation');

// API cho Admin (route /api/admin, đã qua requireAuth + requireRole('admin')).

const PAGE_SIZE = 20;
const ALREADY_REVIEWED = 'Yêu cầu này đã được xử lý (có thể bởi admin khác). Vui lòng tải lại.';

// Gửi thông báo kết quả; lỗi ở đây không làm hỏng thao tác duyệt / từ chối
const notifyResult = async (request, type, text) => {
  try {
    await Notification.create({
      id: makeId('n'),
      userId: request.userId,
      type,
      actorName: 'Admin',
      requestId: request.id,
      text,
    });
  } catch (err) {
    console.error('Không tạo được thông báo kết quả đăng ký nghệ sĩ:', err.message);
  }
};

// Số liệu cho Admin console
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Gắn tên admin đã xử lý vào các yêu cầu (để hiện "by Admin Team")
const withReviewerNames = async (requests) => {
  const ids = [...new Set(requests.map((r) => r.reviewedBy).filter(Boolean))];
  const admins = ids.length ? await User.find({ id: { $in: ids } }).select('id name').lean() : [];
  const nameById = new Map(admins.map((a) => [a.id, a.name]));
  return requests.map((r) => ({ ...toResponse(r), reviewerName: nameById.get(r.reviewedBy) || '' }));
};

// Số liệu cho Dashboard của khu Admin:
// tổng số + số mới trong 7 ngày, các yêu cầu đang chờ (cũ nhất trước) và hoạt động gần đây
exports.getSummary = async (req, res) => {
  try {
    const weekAgo = new Date(Date.now() - WEEK_MS);
    const recentFilter = { createdAt: { $gte: weekAgo } };
    const [pendingRequests, artists, users, songs, artistsNew, usersNew, songsNew, pending, recent] = await Promise.all([
      ArtistRequest.countDocuments({ status: 'pending' }),
      Artist.countDocuments(),
      User.countDocuments(),
      Song.countDocuments(PUBLIC_SONG_FILTER),
      Artist.countDocuments(recentFilter),
      User.countDocuments(recentFilter),
      Song.countDocuments({ ...PUBLIC_SONG_FILTER, ...recentFilter }),
      ArtistRequest.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(3),
      ArtistRequest.find({ status: { $in: ['approved', 'rejected'] } }).sort({ reviewedAt: -1 }).limit(5),
    ]);
    const moderation = await moderationSummary(weekAgo);
    res.status(200).json({
      success: true,
      data: {
        ...moderation,
        pendingRequests,
        artists,
        users,
        songs,
        thisWeek: { artists: artistsNew, users: usersNew, songs: songsNew },
        oldestPendingAt: pending[0]?.createdAt || null,
        pendingPreview: pending.map(toResponse),
        recentlyReviewed: await withReviewerNames(recent),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Giai đoạn 5: báo cáo đang mở, vi phạm, tài khoản bị khoá / sắp bị khoá, nhật ký thao tác gần đây
const moderationSummary = async (weekAgo) => {
  const [openGroups, violations, violationsWeek, lockedUsers, perUser, actions] = await Promise.all([
    Report.aggregate([
      { $match: { status: 'open' } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: { t: '$targetType', id: '$targetId' }, count: { $sum: 1 }, latestAt: { $first: '$createdAt' }, reason: { $first: '$reason' }, snapshot: { $first: '$snapshot' } } },
      { $sort: { count: -1, latestAt: -1 } },
    ]),
    Violation.countDocuments({ revokedAt: null }),
    Violation.countDocuments({ revokedAt: null, createdAt: { $gte: weekAgo } }),
    User.countDocuments({ lockedAt: { $ne: null } }),
    Violation.aggregate([{ $match: { revokedAt: null } }, { $group: { _id: '$userId', n: { $sum: 1 } } }, { $match: { n: MAX_VIOLATIONS } }]),
    AdminAction.find().sort({ createdAt: -1 }).limit(8).lean(),
  ]);
  // Người đang 3/3 nhưng chưa bị khoá
  const atLimitIds = perUser.map((r) => r._id);
  const atLimit = atLimitIds.length ? await User.countDocuments({ id: { $in: atLimitIds }, lockedAt: null }) : 0;
  const adminIds = [...new Set(actions.map((a) => a.adminId).filter(Boolean))];
  const admins = adminIds.length ? await User.find({ id: { $in: adminIds } }).select('id name').lean() : [];
  const nameById = new Map(admins.map((a) => [a.id, a.name]));
  const byType = { song: 0, post: 0, comment: 0 };
  openGroups.forEach((g) => { byType[g._id.t] = (byType[g._id.t] || 0) + 1; });
  return {
    openReports: openGroups.length,
    openReportsByType: byType,
    reportsPreview: openGroups.slice(0, 3).map((g) => ({
      targetType: g._id.t,
      targetId: g._id.id,
      count: g.count,
      latestAt: g.latestAt,
      reason: g.reason,
      reasonLabel: ruleLabel(g.reason),
      snapshot: g.snapshot,
    })),
    violations,
    violationsThisWeek: violationsWeek,
    lockedUsers,
    usersAtLimit: atLimit,
    maxViolations: MAX_VIOLATIONS,
    recentActions: actions.map((a) => ({
      id: a.id,
      action: a.action,
      targetType: a.targetType,
      targetId: a.targetId,
      targetLabel: a.targetLabel,
      rule: a.rule,
      ruleLabel: a.rule ? ruleLabel(a.rule) : '',
      note: a.note,
      adminName: a.adminId ? nameById.get(a.adminId) || 'Admin' : '',
      createdAt: a.createdAt,
    })),
  };
};

// Lịch sử duyệt của chính admin đang đăng nhập (mới nhất trước)
exports.getMyReviews = async (req, res) => {
  try {
    const filter = { reviewedBy: req.user.id, status: { $in: ['approved', 'rejected'] } };
    const [requests, approved, rejected] = await Promise.all([
      ArtistRequest.find(filter).sort({ reviewedAt: -1 }).limit(50),
      ArtistRequest.countDocuments({ ...filter, status: 'approved' }),
      ArtistRequest.countDocuments({ ...filter, status: 'rejected' }),
    ]);
    res.status(200).json({ success: true, counts: { approved, rejected }, data: requests.map(toResponse) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Danh sách yêu cầu theo trạng thái, tìm theo nghệ danh / tên / email người gửi.
// Đang chờ: cũ nhất trước (xử lý theo thứ tự đến). Trạng thái khác: mới xử lý nhất trước.
exports.listRequests = async (req, res) => {
  try {
    const status = REQUEST_STATUSES.includes(req.query.status) ? req.query.status : 'pending';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const filter = { status };
    if (q) {
      const pattern = new RegExp(escapeRegex(q), 'i');
      const users = await User.find({ $or: [{ name: pattern }, { email: pattern }] }).select('id').lean();
      filter.$or = [{ stageName: pattern }, { userId: { $in: users.map((u) => u.id) } }];
    }
    const sort = status === 'pending' ? { createdAt: 1 } : { reviewedAt: -1, updatedAt: -1 };

    const [total, requests, countsRaw] = await Promise.all([
      ArtistRequest.countDocuments(filter),
      ArtistRequest.find(filter).sort(sort).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
      ArtistRequest.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);
    const applicants = await User.find({ id: { $in: requests.map((r) => r.userId) } }).select('id name email').lean();
    const byId = new Map(applicants.map((u) => [u.id, u]));
    const counts = Object.fromEntries(REQUEST_STATUSES.map((s) => [s, 0]));
    countsRaw.forEach((c) => { counts[c._id] = c.n; });

    res.status(200).json({
      success: true,
      page,
      pageSize: PAGE_SIZE,
      total,
      counts,
      data: requests.map((r) => ({
        ...toResponse(r),
        applicant: byId.get(r.userId) ? { name: byId.get(r.userId).name, email: byId.get(r.userId).email } : null,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Chi tiết 1 yêu cầu: hồ sơ, tài khoản người gửi, số lần gửi trước, nghệ danh còn trống không
exports.getRequest = async (req, res) => {
  try {
    const request = await ArtistRequest.findOne({ id: req.params.id });
    if (!request) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu.' });
    const [user, previousRequests, nameTaken] = await Promise.all([
      User.findOne({ id: request.userId }).select('id name email role createdAt').lean(),
      ArtistRequest.countDocuments({ userId: request.userId, id: { $ne: request.id }, createdAt: { $lt: request.createdAt } }),
      request.status === 'pending' ? isStageNameTaken(request.stageName, request.id) : Promise.resolve(false),
    ]);
    res.status(200).json({
      success: true,
      data: {
        ...toResponse(request),
        applicant: user ? { id: user.id, name: user.name, email: user.email, role: user.role, memberSince: user.createdAt } : null,
        previousRequests,
        nameAvailable: !nameTaken,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Duyệt: tạo trang nghệ sĩ + đổi role người gửi + gửi thông báo.
// Bước 1 "giành" yêu cầu bằng cập nhật có điều kiện (status đang là pending) nên hai admin bấm
// cùng lúc thì chỉ một người thành công. Nếu bước sau lỗi thì hoàn tác các bước trước.
exports.approveRequest = async (req, res) => {
  const adminId = req.user.id;
  let request = null;
  let artist = null;
  try {
    request = await ArtistRequest.findOneAndUpdate(
      { id: req.params.id, status: 'pending' },
      { status: 'approved', reviewedBy: adminId, reviewedAt: new Date(), verified: req.body?.verified === true },
      { new: true }
    );
    if (!request) {
      const exists = await ArtistRequest.exists({ id: req.params.id });
      return exists
        ? res.status(409).json({ success: false, code: 'ALREADY_REVIEWED', message: ALREADY_REVIEWED })
        : res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu.' });
    }

    const undoRequest = () =>
      ArtistRequest.updateOne({ id: request.id }, { status: 'pending', reviewedBy: null, reviewedAt: null, verified: false });

    if (await isStageNameTaken(request.stageName, request.id)) {
      await undoRequest();
      return res.status(409).json({ success: false, code: 'NAME_TAKEN', message: 'Nghệ danh đã được dùng bởi trang nghệ sĩ khác. Hãy từ chối yêu cầu này.' });
    }

    artist = await Artist.create({
      id: makeId('art'),
      name: request.stageName,
      ownerUserId: request.userId,
      followersCount: 0,
      avatarImage: request.avatarImage || '',
      bio: request.bio,
      genres: request.genres,
      socialLinks: request.socialLinks,
      isPopular: false,
      isVerified: request.verified,
    });

    // Chỉ đổi role nếu người gửi vẫn đang là listener
    const user = await User.findOneAndUpdate(
      { id: request.userId, role: 'listener' },
      { role: 'artist', artistId: artist.id },
      { new: true }
    );
    if (!user) {
      await Artist.deleteOne({ id: artist.id });
      await undoRequest();
      return res.status(409).json({ success: false, code: 'USER_NOT_LISTENER', message: 'Tài khoản người gửi không còn tồn tại hoặc không còn là người nghe.' });
    }

    request.createdArtistId = artist.id;
    await request.save();
    await notifyResult(request, 'artist_request_approved', request.stageName);

    res.status(200).json({ success: true, message: 'Đã duyệt.', data: { request: toResponse(request), artist } });
  } catch (err) {
    // Hoàn tác phần đã làm để không có trang nghệ sĩ "mồ côi"
    try {
      if (artist) await Artist.deleteOne({ id: artist.id });
      if (request) await ArtistRequest.updateOne({ id: request.id }, { status: 'pending', reviewedBy: null, reviewedAt: null, createdArtistId: null });
    } catch {}
    res.status(500).json({ success: false, message: err.message });
  }
};

// Từ chối: bắt buộc lý do (và ghi chú nếu chọn "other")
exports.rejectRequest = async (req, res) => {
  try {
    const { errors, value } = validateRejection(req.body);
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, code: 'INVALID', message: Object.values(errors)[0], errors });
    }
    const request = await ArtistRequest.findOneAndUpdate(
      { id: req.params.id, status: 'pending' },
      { status: 'rejected', reviewedBy: req.user.id, reviewedAt: new Date(), rejectReason: value.reason, rejectNote: value.note },
      { new: true }
    );
    if (!request) {
      const exists = await ArtistRequest.exists({ id: req.params.id });
      return exists
        ? res.status(409).json({ success: false, code: 'ALREADY_REVIEWED', message: ALREADY_REVIEWED })
        : res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu.' });
    }
    await notifyResult(request, 'artist_request_rejected', REJECT_REASONS[value.reason]);
    res.status(200).json({ success: true, message: 'Đã từ chối.', data: toResponse(request) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
