// Tab Manage của khu Admin (giai đoạn 5): Users / Artists / Reports.
// Route /api/admin/manage/..., đã qua requireAuth + requireRole('admin') (req.user = admin đang thao tác).
const User = require('../models/User');
const Artist = require('../models/Artist');
const Song = require('../models/Song');
const FeedPost = require('../models/FeedPost');
const Comment = require('../models/Comment');
const Playlist = require('../models/Playlist');
const Report = require('../models/Report');
const Violation = require('../models/Violation');
const { escapeRegex } = require('../utils/ids');
const { parseCount } = require('../utils/legacyData');
const { TARGET_TYPES, MAX_VIOLATIONS, ruleLabel } = require('../config/moderation');
const { validateRuleInput, roleChangeError, lockError, unlockError, nextRemovalLocks } = require('../utils/moderationRules');
const mod = require('../services/moderation');

const PAGE_SIZE = 30;
const pageOf = (req) => Math.max(1, parseInt(req.query.page, 10) || 1);
const queryOf = (req) => (typeof req.query.q === 'string' ? req.query.q.trim() : '');
const fail = (res, status, message, code) => res.status(status).json({ success: false, ...(code ? { code } : {}), message });
const invalid = (res, errors) => fail(res, 400, Object.values(errors)[0], 'INVALID');

const wrap = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Số vi phạm còn hiệu lực theo từng tài khoản
const violationCounts = async (userIds) => {
  if (!userIds.length) return new Map();
  const rows = await Violation.aggregate([
    { $match: { userId: { $in: userIds }, revokedAt: null } },
    { $group: { _id: '$userId', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.n]));
};

// Số trên 3 nút Users / Artists / Reports
const segmentCounts = async () => {
  const openTargets = await Report.aggregate([
    { $match: { status: 'open' } },
    { $group: { _id: { t: '$targetType', id: '$targetId' } } },
    { $count: 'n' },
  ]);
  const [users, artists] = await Promise.all([User.countDocuments(), Artist.countDocuments()]);
  return { users, artists, reports: openTargets[0]?.n || 0 };
};

const lockInfo = (u) =>
  u.lockedAt ? { lockedAt: u.lockedAt, type: u.lockType, rule: u.lockReason, ruleLabel: ruleLabel(u.lockReason), note: u.lockNote, by: u.lockedBy } : null;

// ======================= Users =======================
const USER_FILTERS = ['all', 'listener', 'artist', 'admin', 'locked', 'violations'];

exports.listUsers = wrap(async (req, res) => {
  const filterKey = USER_FILTERS.includes(req.query.filter) ? req.query.filter : 'all';
  const page = pageOf(req);
  const q = queryOf(req);
  const filter = {};
  if (['listener', 'artist', 'admin'].includes(filterKey)) filter.role = filterKey;
  if (filterKey === 'locked') filter.lockedAt = { $ne: null };
  if (filterKey === 'violations') filter.id = { $in: await Violation.distinct('userId', { revokedAt: null }) };
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }
  const [total, users, segments] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).select('-password').sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    segmentCounts(),
  ]);
  const counts = await violationCounts(users.map((u) => u.id));
  res.status(200).json({
    success: true,
    page,
    pageSize: PAGE_SIZE,
    total,
    segments,
    maxViolations: MAX_VIOLATIONS,
    data: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role || 'listener',
      planId: u.planId,
      planExpiresAt: u.planExpiresAt,
      violations: counts.get(u.id) || 0,
      lock: lockInfo(u),
      isSelf: u.id === req.user.id,
    })),
  });
});

const hiddenContentCounts = async (user) => {
  const [comments, replies, artist] = await Promise.all([
    Comment.countDocuments({ userId: user.id }),
    Comment.aggregate([{ $unwind: '$replies' }, { $match: { 'replies.userId': user.id } }, { $count: 'n' }]),
    user.artistId ? Artist.findOne({ id: user.artistId }).select('id').lean() : null,
  ]);
  const [songs, posts] = artist
    ? await Promise.all([Song.countDocuments({ artistId: artist.id }), FeedPost.countDocuments({ authorArtistId: artist.id })])
    : [0, 0];
  return { comments: comments + (replies[0]?.n || 0), songs, posts };
};

exports.getUser = wrap(async (req, res) => {
  const user = await User.findOne({ id: req.params.id }).select('-password').lean();
  if (!user) return fail(res, 404, 'User not found.');
  const [violations, playlists, content, reportsAgainst, adminCount, artist] = await Promise.all([
    Violation.find({ userId: user.id }).sort({ createdAt: -1 }).lean(),
    Playlist.countDocuments({ ownerId: user.id }),
    hiddenContentCounts(user),
    Report.countDocuments({ authorUserId: user.id }),
    User.countDocuments({ role: 'admin' }),
    user.artistId ? Artist.findOne({ id: user.artistId }).select('id name hiddenAt isVerified').lean() : null,
  ]);
  const adminIds = [...new Set(violations.map((v) => v.adminId).concat(user.lockedBy ? [user.lockedBy] : []))];
  const admins = await User.find({ id: { $in: adminIds } }).select('id name').lean();
  const adminName = new Map(admins.map((a) => [a.id, a.name]));
  const active = violations.filter((v) => !v.revokedAt).length;
  const lock = lockInfo(user);
  res.status(200).json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'listener',
      planId: user.planId,
      planExpiresAt: user.planExpiresAt,
      createdAt: user.createdAt,
      isSelf: user.id === req.user.id,
      lock: lock && { ...lock, byName: lock.by === 'auto' ? 'Automatically' : adminName.get(lock.by) || 'Admin' },
      violations: violations.map((v) => ({
        id: v.id,
        targetType: v.targetType,
        targetId: v.targetId,
        snapshot: v.snapshot,
        rule: v.rule,
        ruleLabel: ruleLabel(v.rule),
        note: v.note,
        adminName: adminName.get(v.adminId) || 'Admin',
        createdAt: v.createdAt,
        revokedAt: v.revokedAt,
      })),
      activeViolations: active,
      maxViolations: MAX_VIOLATIONS,
      stats: { playlists, ...content, reportsAgainst },
      artist: artist ? { id: artist.id, name: artist.name, hidden: !!artist.hiddenAt } : null,
      can: {
        lock: !lockError({ actorId: req.user.id, target: user }),
        unlock: !unlockError(user),
        changeRole: !roleChangeError({ actorId: req.user.id, target: user, newRole: user.role === 'admin' ? 'listener' : 'admin', adminCount }),
      },
    },
  });
});

exports.lockUser = wrap(async (req, res) => {
  const user = await User.findOne({ id: req.params.id });
  if (!user) return fail(res, 404, 'User not found.');
  const { errors, value } = validateRuleInput(req.body);
  if (Object.keys(errors).length) return invalid(res, errors);
  const err = lockError({ actorId: req.user.id, target: user });
  if (err) return fail(res, 409, err, 'CANNOT_LOCK');
  await mod.lockManually(req.user, user, value);
  res.status(200).json({ success: true, message: 'Account locked.' });
});

exports.unlockUser = wrap(async (req, res) => {
  const user = await User.findOne({ id: req.params.id });
  if (!user) return fail(res, 404, 'User not found.');
  const err = unlockError(user);
  if (err) return fail(res, 409, err, user.lockType === 'permanent' ? 'PERMANENT_LOCK' : 'NOT_LOCKED');
  await mod.unlockManually(req.user, user);
  res.status(200).json({ success: true, message: 'Account unlocked.' });
});

exports.changeRole = wrap(async (req, res) => {
  const user = await User.findOne({ id: req.params.id });
  if (!user) return fail(res, 404, 'User not found.');
  const newRole = String(req.body?.role || '');
  const adminCount = await User.countDocuments({ role: 'admin' });
  const err = roleChangeError({ actorId: req.user.id, target: user, newRole, adminCount });
  if (err) return fail(res, 400, err, 'INVALID_ROLE');
  await mod.changeRole(req.user, user, newRole);
  res.status(200).json({ success: true, message: 'Role updated.', role: newRole });
});

exports.revokeViolation = wrap(async (req, res) => {
  const violation = await Violation.findOne({ id: req.params.id });
  if (!violation) return fail(res, 404, 'Violation not found.');
  if (violation.revokedAt) return fail(res, 409, 'This violation was already revoked.', 'ALREADY_REVOKED');
  const result = await mod.revokeViolation(req.user, violation);
  res.status(200).json({ success: true, message: 'Violation revoked. The content is visible again.', ...result });
});

// ======================= Artists =======================
const ARTIST_FILTERS = ['all', 'verified', 'unverified', 'hidden'];

const artistSongStats = async (artistIds) => {
  if (!artistIds.length) return new Map();
  const rows = await Song.aggregate([
    { $match: { artistId: { $in: artistIds } } },
    { $group: { _id: '$artistId', songs: { $sum: 1 }, plays: { $sum: { $cond: [{ $isNumber: '$plays' }, '$plays', 0] } } } },
  ]);
  return new Map(rows.map((r) => [r._id, r]));
};

exports.listArtists = wrap(async (req, res) => {
  const filterKey = ARTIST_FILTERS.includes(req.query.filter) ? req.query.filter : 'all';
  const page = pageOf(req);
  const q = queryOf(req);
  const filter = {};
  if (filterKey === 'verified') filter.isVerified = true;
  if (filterKey === 'unverified') filter.isVerified = false;
  if (filterKey === 'hidden') filter.$or = [{ hiddenAt: { $ne: null } }, { ownerLockedAt: { $ne: null } }];
  if (q) filter.name = new RegExp(escapeRegex(q), 'i');
  const [total, artists, segments] = await Promise.all([
    Artist.countDocuments(filter),
    Artist.find(filter).sort({ followersCount: -1, name: 1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    segmentCounts(),
  ]);
  const [stats, counts] = await Promise.all([
    artistSongStats(artists.map((a) => a.id)),
    violationCounts(artists.map((a) => a.ownerUserId).filter(Boolean)),
  ]);
  res.status(200).json({
    success: true,
    page,
    pageSize: PAGE_SIZE,
    total,
    segments,
    maxViolations: MAX_VIOLATIONS,
    data: artists.map((a) => ({
      id: a.id,
      name: a.name,
      avatarImage: a.avatarImage || '',
      isVerified: !!a.isVerified,
      followers: a.followersCount || 0,
      songs: stats.get(a.id)?.songs || 0,
      plays: stats.get(a.id)?.plays || 0,
      hasOwner: !!a.ownerUserId,
      hidden: !!a.hiddenAt,
      ownerLocked: !!a.ownerLockedAt,
      ownerViolations: a.ownerUserId ? counts.get(a.ownerUserId) || 0 : 0,
    })),
  });
});

exports.getArtist = wrap(async (req, res) => {
  const artist = await Artist.findOne({ id: req.params.id }).lean();
  if (!artist) return fail(res, 404, 'Artist not found.');
  const [owner, songs] = await Promise.all([
    artist.ownerUserId ? User.findOne({ id: artist.ownerUserId }).select('id name email lockedAt lockType').lean() : null,
    Song.find({ artistId: artist.id }).sort({ createdAt: -1 }).lean(),
  ]);
  const ownerViolations = owner ? await mod.activeViolationCount(owner.id) : 0;
  const removedIds = songs.map((s) => s.removedViolationId).filter(Boolean);
  const violationNo = new Map();
  if (owner && removedIds.length) {
    const all = await Violation.find({ userId: owner.id }).sort({ createdAt: 1 }).select('id').lean();
    all.forEach((v, i) => violationNo.set(v.id, i + 1));
  }
  res.status(200).json({
    success: true,
    data: {
      id: artist.id,
      name: artist.name,
      avatarImage: artist.avatarImage || '',
      genres: artist.genres || [],
      createdAt: artist.createdAt,
      isVerified: !!artist.isVerified,
      followers: artist.followersCount || 0,
      hidden: artist.hiddenAt ? { at: artist.hiddenAt, rule: artist.hiddenReason, ruleLabel: ruleLabel(artist.hiddenReason), note: artist.hiddenNote } : null,
      ownerLocked: !!artist.ownerLockedAt,
      owner: owner ? { id: owner.id, name: owner.name, email: owner.email, locked: !!owner.lockedAt, lockType: owner.lockType, violations: ownerViolations } : null,
      maxViolations: MAX_VIOLATIONS,
      totals: { songs: songs.length, plays: songs.reduce((s, x) => s + parseCount(x.plays), 0) },
      songs: songs.map((s) => ({
        id: s.id,
        title: s.title,
        coverImage: s.coverImage || '',
        status: s.status || 'published',
        plays: parseCount(s.plays),
        removed: s.removedAt ? { at: s.removedAt, rule: s.removedRule, ruleLabel: ruleLabel(s.removedRule), violationId: s.removedViolationId, number: violationNo.get(s.removedViolationId) || null } : null,
      })),
    },
  });
});

exports.setVerified = wrap(async (req, res) => {
  const artist = await Artist.findOne({ id: req.params.id });
  if (!artist) return fail(res, 404, 'Artist not found.');
  await mod.setVerified(req.user, artist, !!req.body?.verified);
  res.status(200).json({ success: true, isVerified: artist.isVerified });
});

exports.hideArtist = wrap(async (req, res) => {
  const artist = await Artist.findOne({ id: req.params.id });
  if (!artist) return fail(res, 404, 'Artist not found.');
  if (artist.hiddenAt) return fail(res, 409, 'This artist page is already hidden.', 'ALREADY_HIDDEN');
  const { errors, value } = validateRuleInput(req.body);
  if (Object.keys(errors).length) return invalid(res, errors);
  await mod.hideArtistPage(req.user, artist, value);
  res.status(200).json({ success: true, message: 'Artist page hidden.' });
});

exports.unhideArtist = wrap(async (req, res) => {
  const artist = await Artist.findOne({ id: req.params.id });
  if (!artist) return fail(res, 404, 'Artist not found.');
  if (!artist.hiddenAt) return fail(res, 409, 'This artist page is not hidden.', 'NOT_HIDDEN');
  await mod.unhideArtistPage(req.user, artist);
  res.status(200).json({ success: true, message: 'Artist page is visible again.' });
});

// ======================= Nội dung =======================
// Gỡ bài hát / bài đăng / bình luận (từ chi tiết nghệ sĩ hoặc chi tiết báo cáo) = 1 vi phạm của tác giả
exports.removeContent = wrap(async (req, res) => {
  const { type, id } = req.params;
  if (!TARGET_TYPES.includes(type)) return fail(res, 400, 'Unknown content type.');
  const target = await mod.findTarget(type, id);
  if (!target) return fail(res, 404, 'Content not found.');
  if (target.removed) return fail(res, 409, 'This content was already removed.', 'ALREADY_REMOVED');
  const { errors, value } = validateRuleInput(req.body);
  if (Object.keys(errors).length) return invalid(res, errors);
  const result = await mod.removeContent(req.user, target, value);
  res.status(200).json({
    success: true,
    message: result.locked ? 'Removed. The author reached 4 violations and was locked permanently.' : 'Removed.',
    violationId: result.violation?.id || null,
    violationCount: result.violationCount,
    locked: result.locked,
  });
});

// ======================= Reports =======================
// Báo cáo gộp theo nội dung: nhiều báo cáo nhất trước, rồi mới nhất trước
exports.listReports = wrap(async (req, res) => {
  const status = req.query.status === 'resolved' ? 'resolved' : 'open';
  const match = { status };
  if (TARGET_TYPES.includes(req.query.type)) match.targetType = req.query.type;
  const [groups, segments] = await Promise.all([
    Report.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { t: '$targetType', id: '$targetId' },
          count: { $sum: 1 },
          latestAt: { $first: '$createdAt' },
          reasons: { $push: '$reason' },
          snapshot: { $first: '$snapshot' },
          authorUserId: { $first: '$authorUserId' },
          outcome: { $first: '$outcome' },
          resolvedAt: { $max: '$resolvedAt' },
        },
      },
      { $sort: status === 'open' ? { count: -1, latestAt: -1 } : { resolvedAt: -1 } },
      { $limit: 100 },
    ]),
    segmentCounts(),
  ]);
  const authorIds = [...new Set(groups.map((g) => g.authorUserId).filter(Boolean))];
  const [authors, counts] = await Promise.all([
    User.find({ id: { $in: authorIds } }).select('id name').lean(),
    violationCounts(authorIds),
  ]);
  const nameById = new Map(authors.map((a) => [a.id, a.name]));
  // Lý do được chọn nhiều nhất
  const topReason = (reasons) => {
    const c = {};
    reasons.forEach((r) => { c[r] = (c[r] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || 'other';
  };
  res.status(200).json({
    success: true,
    status,
    segments,
    maxViolations: MAX_VIOLATIONS,
    data: groups.map((g) => {
      const reason = topReason(g.reasons);
      return {
        targetType: g._id.t,
        targetId: g._id.id,
        count: g.count,
        latestAt: g.latestAt,
        reason,
        reasonLabel: ruleLabel(reason),
        snapshot: g.snapshot,
        author: g.authorUserId ? { id: g.authorUserId, name: nameById.get(g.authorUserId) || '', violations: counts.get(g.authorUserId) || 0 } : null,
        outcome: g.outcome,
        resolvedAt: g.resolvedAt,
      };
    }),
  });
});

exports.getReport = wrap(async (req, res) => {
  const { type, id } = req.params;
  if (!TARGET_TYPES.includes(type)) return fail(res, 400, 'Unknown content type.');
  const [target, reports] = await Promise.all([
    mod.findTarget(type, id),
    Report.find({ targetType: type, targetId: id }).sort({ createdAt: -1 }).lean(),
  ]);
  if (!target && !reports.length) return fail(res, 404, 'Report not found.');
  const authorId = target?.authorUserId || reports[0]?.authorUserId || null;
  const userIds = [...new Set(reports.map((r) => r.reporterId).concat(authorId ? [authorId] : []))];
  const users = await User.find({ id: { $in: userIds } }).select('id name role lockType lockedAt').lean();
  const userById = new Map(users.map((u) => [u.id, u]));
  const author = authorId ? userById.get(authorId) : null;
  const violations = author ? await mod.activeViolationCount(author.id) : 0;

  // Nơi nội dung xuất hiện (để admin hiểu ngữ cảnh)
  let context = '';
  if (type === 'comment' && target?.postId) {
    const post = await FeedPost.findOne({ id: target.postId }).select('content authorArtistId authorName').lean();
    const artist = post?.authorArtistId ? await Artist.findOne({ id: post.authorArtistId }).select('name').lean() : null;
    context = post ? `${artist?.name || post.authorName} · "${mod.snippet(post.content, 40) || 'Post'}"` : '';
  } else if ((type === 'song' || type === 'post') && target?.artist) {
    context = target.artist.name;
  }
  const open = reports.filter((r) => r.status === 'open');
  res.status(200).json({
    success: true,
    data: {
      targetType: type,
      targetId: id,
      text: target ? target.text : reports[0]?.snapshot || '',
      context,
      exists: !!target,
      removed: !!target?.removed,
      status: open.length ? 'open' : 'resolved',
      outcome: open.length ? null : reports[0]?.outcome || null,
      author: author ? { id: author.id, name: author.name, role: author.role, locked: !!author.lockedAt, violations } : null,
      maxViolations: MAX_VIOLATIONS,
      willLock: !!author && author.role !== 'admin' && nextRemovalLocks(violations, author.lockType),
      reports: reports.map((r) => ({
        id: r.id,
        reporterName: userById.get(r.reporterId)?.name || 'User',
        reason: r.reason,
        reasonLabel: ruleLabel(r.reason),
        details: r.details,
        status: r.status,
        createdAt: r.createdAt,
      })),
    },
  });
});

exports.dismissReports = wrap(async (req, res) => {
  const { type, id } = req.params;
  if (!TARGET_TYPES.includes(type)) return fail(res, 400, 'Unknown content type.');
  const open = await Report.countDocuments({ targetType: type, targetId: id, status: 'open' });
  if (!open) return fail(res, 409, 'There are no open reports for this content.', 'NO_OPEN_REPORTS');
  const target = (await mod.findTarget(type, id)) || { targetType: type, targetId: id, label: '' };
  const dismissed = await mod.dismissReports(req.user, target);
  res.status(200).json({ success: true, message: 'Reports dismissed.', dismissed });
});
