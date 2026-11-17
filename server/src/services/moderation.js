// Kiểm duyệt nội dung và tài khoản (giai đoạn 5): gỡ / khôi phục, vi phạm, khoá, ẩn trang nghệ sĩ, nhật ký
const User = require('../models/User');
const Artist = require('../models/Artist');
const Song = require('../models/Song');
const FeedPost = require('../models/FeedPost');
const Comment = require('../models/Comment');
const Report = require('../models/Report');
const Violation = require('../models/Violation');
const AdminAction = require('../models/AdminAction');
const Notification = require('../models/Notification');
const { makeId } = require('../utils/ids');
const { ruleLabel } = require('../config/moderation');
const { reachesPermanentLock, unlockAfterRevoke } = require('../utils/moderationRules');

const snippet = (text, max = 120) => {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

// ---------------- Nhật ký ----------------
const logAction = (adminId, action, { targetType, targetId, targetLabel = '', rule = '', note = '' }) =>
  AdminAction.create({ id: makeId('aa'), adminId: adminId || null, action, targetType, targetId, targetLabel, rule, note });

const notify = async (userId, type, fields) => {
  if (!userId) return;
  try {
    await Notification.create({ id: makeId('n'), userId, type, actorName: 'MusicStream', ...fields });
  } catch (err) {
    console.error('Không tạo được thông báo kiểm duyệt:', err.message);
  }
};

// ---------------- Nội dung ----------------
// Tìm nội dung theo loại + id, kèm tài khoản tác giả. Bình luận có thể là bình luận gốc hoặc một câu trả lời.
// Trả về null nếu không có.
const findTarget = async (targetType, targetId) => {
  if (targetType === 'song') {
    const song = await Song.findOne({ id: targetId });
    if (!song) return null;
    const artist = song.artistId ? await Artist.findOne({ id: song.artistId }).select('id name ownerUserId').lean() : null;
    return {
      targetType,
      targetId,
      doc: song,
      authorUserId: artist?.ownerUserId || null,
      artist,
      label: song.title,
      text: song.title,
      removed: !!song.removedAt,
      visible: !song.removedAt && !song.suspendedAt && !['draft', 'hidden'].includes(song.status),
    };
  }
  if (targetType === 'post') {
    const post = await FeedPost.findOne({ id: targetId });
    if (!post) return null;
    const artist = post.authorArtistId ? await Artist.findOne({ id: post.authorArtistId }).select('id name ownerUserId').lean() : null;
    return {
      targetType,
      targetId,
      doc: post,
      authorUserId: artist?.ownerUserId || null,
      artist,
      label: snippet(post.content, 60) || 'Post',
      text: post.content || '',
      songId: post.songId || null,
      removed: !!post.removedAt,
      visible: !post.removedAt && !post.suspendedAt,
    };
  }
  if (targetType === 'comment') {
    const comment = await Comment.findOne({ $or: [{ id: targetId }, { 'replies.id': targetId }] });
    if (!comment) return null;
    const reply = comment.id === targetId ? null : comment.replies.find((r) => r.id === targetId);
    const node = reply || comment;
    return {
      targetType,
      targetId,
      doc: comment,
      reply,
      authorUserId: node.userId || null,
      authorName: node.userName,
      postId: comment.postId,
      label: snippet(node.text, 60),
      text: node.text,
      removed: !!node.removedAt || (!!reply && !!comment.removedAt),
      visible: !node.removedAt && !comment.removedAt,
    };
  }
  return null;
};

const markRemoved = async (target, violationId, rule) => {
  const now = new Date();
  if (target.targetType === 'comment') {
    const node = target.reply || target.doc;
    node.removedAt = now;
    node.removedViolationId = violationId;
    await target.doc.save();
    return;
  }
  target.doc.removedAt = now;
  target.doc.removedRule = rule;
  target.doc.removedViolationId = violationId;
  await target.doc.save();
};

const markRestored = async (target) => {
  if (target.targetType === 'comment') {
    const node = target.reply || target.doc;
    node.removedAt = null;
    node.removedViolationId = null;
    await target.doc.save();
    return;
  }
  target.doc.removedAt = null;
  target.doc.removedRule = '';
  target.doc.removedViolationId = null;
  await target.doc.save();
};

const activeViolationCount = (userId) => Violation.countDocuments({ userId, revokedAt: null });

// ---------------- Tạm ẩn nội dung của nghệ sĩ ----------------
// Trang bị admin ẩn hoặc chủ trang bị khoá → mọi bài hát và bài đăng của trang tạm ẩn; ngược lại thì hiện lại.
const syncArtistSuspension = async (artistId) => {
  if (!artistId) return;
  const artist = await Artist.findOne({ id: artistId }).select('hiddenAt ownerLockedAt').lean();
  if (!artist) return;
  const suspended = !!(artist.hiddenAt || artist.ownerLockedAt);
  if (suspended) {
    const now = new Date();
    await Promise.all([
      Song.updateMany({ artistId, suspendedAt: null }, { suspendedAt: now }),
      FeedPost.updateMany({ authorArtistId: artistId, suspendedAt: null }, { suspendedAt: now }),
    ]);
  } else {
    await Promise.all([
      Song.updateMany({ artistId }, { suspendedAt: null }),
      FeedPost.updateMany({ authorArtistId: artistId }, { suspendedAt: null }),
    ]);
  }
};

// ---------------- Khoá tài khoản ----------------
const applyLock = async (user, { type, rule, note = '', by }) => {
  user.lockedAt = new Date();
  user.lockType = type;
  user.lockReason = rule;
  user.lockNote = note;
  user.lockedBy = by;
  await user.save();
  if (user.artistId) {
    await Artist.updateOne({ id: user.artistId }, { ownerLockedAt: user.lockedAt });
    await syncArtistSuspension(user.artistId);
  }
};

const applyUnlock = async (user) => {
  user.lockedAt = null;
  user.lockType = null;
  user.lockReason = '';
  user.lockNote = '';
  user.lockedBy = null;
  await user.save();
  if (user.artistId) {
    await Artist.updateOne({ id: user.artistId }, { ownerLockedAt: null });
    await syncArtistSuspension(user.artistId);
  }
};

const lockManually = async (admin, user, { rule, note }) => {
  await applyLock(user, { type: 'manual', rule, note, by: admin.id });
  await logAction(admin.id, 'lock', { targetType: 'user', targetId: user.id, targetLabel: user.name, rule, note });
};

const unlockManually = async (admin, user) => {
  await applyUnlock(user);
  await logAction(admin.id, 'unlock', { targetType: 'user', targetId: user.id, targetLabel: user.name });
};

// ---------------- Gỡ nội dung = 1 vi phạm ----------------
// Gỡ nội dung, ghi 1 vi phạm cho tác giả (trừ admin / nội dung không có chủ), báo cho tác giả,
// đóng các báo cáo đang mở về nội dung này, và tự khoá vĩnh viễn nếu đây là lần vi phạm thứ 4.
// Trả về { violation, violationCount, locked }.
const removeContent = async (admin, target, { rule, note = '' }) => {
  const author = target.authorUserId ? await User.findOne({ id: target.authorUserId }) : null;
  const counts = author && author.role !== 'admin';
  const reportCount = await Report.countDocuments({ targetType: target.targetType, targetId: target.targetId, status: 'open' });

  let violation = null;
  if (counts) {
    violation = await Violation.create({
      id: makeId('v'),
      userId: author.id,
      targetType: target.targetType,
      targetId: target.targetId,
      snapshot: snippet(target.text, 500),
      rule,
      note,
      adminId: admin.id,
      reportCount,
    });
  }
  await markRemoved(target, violation?.id || null, rule);
  await Report.updateMany(
    { targetType: target.targetType, targetId: target.targetId, status: 'open' },
    { status: 'resolved', outcome: 'removed', resolvedBy: admin.id, resolvedAt: new Date() }
  );
  await logAction(admin.id, 'remove_content', { targetType: target.targetType, targetId: target.targetId, targetLabel: target.label, rule, note });

  let violationCount = 0;
  let locked = false;
  if (counts) {
    violationCount = await activeViolationCount(author.id);
    await notify(author.id, 'content_removed', {
      targetType: target.targetType,
      rule,
      violationCount,
      postId: target.postId || '',
      songId: target.targetType === 'song' ? target.targetId : '',
      text: snippet(target.text),
    });
    if (reachesPermanentLock(violationCount) && author.lockType !== 'permanent') {
      await applyLock(author, { type: 'permanent', rule, note: `Reached ${violationCount} violations`, by: 'auto' });
      await logAction(null, 'auto_lock', { targetType: 'user', targetId: author.id, targetLabel: author.name, rule, note: `${violationCount} violations` });
      locked = true;
    }
  }
  return { violation, violationCount, locked };
};

// Huỷ 1 vi phạm (gỡ nhầm): khôi phục nội dung; tài khoản khoá vĩnh viễn mà còn dưới ngưỡng thì mở lại.
const revokeViolation = async (admin, violation) => {
  violation.revokedAt = new Date();
  violation.revokedBy = admin.id;
  await violation.save();

  const target = await findTarget(violation.targetType, violation.targetId);
  if (target && target.removed) await markRestored(target);

  const user = await User.findOne({ id: violation.userId });
  await logAction(admin.id, 'revoke_violation', {
    targetType: violation.targetType,
    targetId: violation.targetId,
    targetLabel: target?.label || snippet(violation.snapshot, 60),
    rule: violation.rule,
  });
  let unlocked = false;
  const violationCount = user ? await activeViolationCount(user.id) : 0;
  if (user && unlockAfterRevoke(violationCount, user.lockType)) {
    await applyUnlock(user);
    await logAction(null, 'auto_unlock', { targetType: 'user', targetId: user.id, targetLabel: user.name, note: `${violationCount} violations` });
    unlocked = true;
  }
  return { violationCount, unlocked };
};

const dismissReports = async (admin, target) => {
  const res = await Report.updateMany(
    { targetType: target.targetType, targetId: target.targetId, status: 'open' },
    { status: 'resolved', outcome: 'dismissed', resolvedBy: admin.id, resolvedAt: new Date() }
  );
  await logAction(admin.id, 'dismiss_reports', { targetType: target.targetType, targetId: target.targetId, targetLabel: target.label });
  return res.modifiedCount || 0;
};

// ---------------- Trang nghệ sĩ ----------------
const hideArtistPage = async (admin, artist, { rule, note }) => {
  artist.hiddenAt = new Date();
  artist.hiddenReason = rule;
  artist.hiddenNote = note || '';
  await artist.save();
  await syncArtistSuspension(artist.id);
  await logAction(admin.id, 'hide_page', { targetType: 'artist', targetId: artist.id, targetLabel: artist.name, rule, note });
  await notify(artist.ownerUserId, 'artist_page_hidden', { artistId: artist.id, rule, text: ruleLabel(rule) });
};

const unhideArtistPage = async (admin, artist) => {
  artist.hiddenAt = null;
  artist.hiddenReason = '';
  artist.hiddenNote = '';
  await artist.save();
  await syncArtistSuspension(artist.id);
  await logAction(admin.id, 'unhide_page', { targetType: 'artist', targetId: artist.id, targetLabel: artist.name });
  await notify(artist.ownerUserId, 'artist_page_restored', { artistId: artist.id, text: artist.name });
};

const setVerified = async (admin, artist, verified) => {
  artist.isVerified = !!verified;
  await artist.save();
  await logAction(admin.id, verified ? 'verify' : 'unverify', { targetType: 'artist', targetId: artist.id, targetLabel: artist.name });
};

const changeRole = async (admin, user, role) => {
  const from = user.role;
  user.role = role;
  await user.save();
  await logAction(admin.id, 'change_role', { targetType: 'user', targetId: user.id, targetLabel: user.name, note: `${from} → ${role}` });
};

// Id tài khoản đang bị khoá (để ẩn bình luận của họ)
const lockedUserIds = () => User.distinct('id', { lockedAt: { $ne: null } });

module.exports = {
  snippet,
  findTarget,
  removeContent,
  revokeViolation,
  dismissReports,
  activeViolationCount,
  lockManually,
  unlockManually,
  hideArtistPage,
  unhideArtistPage,
  setVerified,
  changeRole,
  syncArtistSuspension,
  lockedUserIds,
  logAction,
};
