// Dữ liệu mẫu cho khu Admin – giai đoạn 5 (dùng trong `npm run seed`).
// Chỉ dùng tài khoản mẫu riêng (email @example.com mới), không đụng các tài khoản test hiện có.
//  - Quang Anh: người nghe đang 3/3 vi phạm, còn 1 bình luận đang bị báo cáo (gỡ nữa là khoá vĩnh viễn)
//  - spam_bot_22: đã khoá vĩnh viễn (4 lần vi phạm)
//  - T.K Beats: nghệ sĩ bị admin khoá tay (trang + bài hát tạm ẩn)
//  - Vài báo cáo đang chờ: bình luận của Quang Anh, 1 bài hát và 1 bài đăng của Mer Watson
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const ADMIN_ID = 'u4';

const buildDemoModeration = ({ now = new Date(), commentPostId = 'fp2', reportedSongId = 's43', reportedPostId = 'fp2' } = {}) => {
  const ago = (ms) => new Date(now.getTime() - ms);

  const users = [
    { id: 'u_quanganh', name: 'Quang Anh', email: 'quanganh@example.com', phone: '0900000011', password: '123456', planId: null, role: 'listener' },
    {
      id: 'u_spambot',
      name: 'spam_bot_22',
      email: 'spambot@example.com',
      phone: '0900000012',
      password: '123456',
      planId: null,
      role: 'listener',
      lockedAt: ago(HOUR_MS),
      lockType: 'permanent',
      lockReason: 'spam',
      lockNote: 'Reached 4 violations',
      lockedBy: 'auto',
    },
    {
      id: 'u_tk',
      name: 'T.K Beats',
      email: 'tk@example.com',
      phone: '0900000013',
      password: '123456',
      planId: null,
      role: 'artist',
      artistId: 'art_tk',
      lockedAt: ago(2 * HOUR_MS),
      lockType: 'manual',
      lockReason: 'scam',
      lockNote: 'Asking fans for bank transfers',
      lockedBy: ADMIN_ID,
    },
  ].map((u) => ({ likedSongIds: [], followedArtistIds: [], likedAlbumIds: [], downloadedSongIds: [], ...u }));

  const artists = [
    {
      id: 'art_tk',
      name: 'T.K Beats',
      ownerUserId: 'u_tk',
      followersCount: 12,
      genres: ['Rap', 'EDM'],
      bio: 'Late night beats.',
      isVerified: false,
      ownerLockedAt: ago(2 * HOUR_MS),
    },
  ];
  const songs = [
    { id: 's_tk1', title: 'Night Drive', artist: 'T.K Beats', artistId: 'art_tk', plays: 240, duration: '03:12', status: 'published', suspendedAt: ago(2 * HOUR_MS) },
    { id: 's_tk2', title: 'Fake Remix', artist: 'T.K Beats', artistId: 'art_tk', plays: 70, duration: '02:58', status: 'published', suspendedAt: ago(2 * HOUR_MS) },
  ];

  const comment = (id, userId, userName, text, at, removedViolationId = null) => ({
    id,
    postId: commentPostId,
    userId,
    userName,
    userAvatar: '',
    text,
    timeAgo: '',
    likes: 0,
    likedByUserIds: [],
    replies: [],
    createdAt: at,
    removedAt: removedViolationId ? at : null,
    removedViolationId,
  });

  // ---- Quang Anh: 3 lần vi phạm + 1 bình luận đang bị báo cáo ----
  const qaRemoved = [
    ['v_qa1', 'c_qa1', 'Check my channel for free followers!!!', 'spam', 9 * DAY_MS],
    ['v_qa2', 'c_qa2', 'You sing like a dying cat, quit music', 'harassment', 4 * DAY_MS],
    ['v_qa3', 'c_qa3', 'Buy followers at cheap price 👉 bit.ly/xxxx', 'spam', 2 * HOUR_MS],
  ];
  // ---- spam_bot_22: 4 lần vi phạm → khoá vĩnh viễn ----
  const sbRemoved = [
    ['v_sb1', 'c_sb1', 'Win a free iPhone, click here', 'spam', 5 * DAY_MS],
    ['v_sb2', 'c_sb2', 'Follow for follow, link in bio', 'spam', 2 * DAY_MS],
    ['v_sb3', 'c_sb3', 'Cheap streams 1000 plays = $1', 'spam', DAY_MS],
    ['v_sb4', 'c_sb4', 'Promote your song here, DM me', 'spam', HOUR_MS],
  ];

  const comments = [
    ...qaRemoved.map(([vid, cid, text, , at]) => comment(cid, 'u_quanganh', 'Quang Anh', text, ago(at), vid)),
    comment('c_qa4', 'u_quanganh', 'Quang Anh', 'Get 10K followers in 1 day 👉 bit.ly/yyyy', ago(5 * HOUR_MS)),
    ...sbRemoved.map(([vid, cid, text, , at]) => comment(cid, 'u_spambot', 'spam_bot_22', text, ago(at), vid)),
    // Bình luận chưa bị gỡ nhưng tài khoản đã khoá → tự ẩn
    comment('c_sb5', 'u_spambot', 'spam_bot_22', 'Nice song, check my profile', ago(3 * HOUR_MS)),
  ];

  const violations = [
    ...qaRemoved.map(([vid, cid, text, rule, at]) => ({ id: vid, userId: 'u_quanganh', targetType: 'comment', targetId: cid, snapshot: text, rule, adminId: ADMIN_ID, reportCount: 1, createdAt: ago(at) })),
    ...sbRemoved.map(([vid, cid, text, rule, at]) => ({ id: vid, userId: 'u_spambot', targetType: 'comment', targetId: cid, snapshot: text, rule, adminId: ADMIN_ID, reportCount: 2, createdAt: ago(at) })),
  ];

  // ---- Báo cáo ----
  const report = (id, targetType, targetId, reporterId, authorUserId, snapshot, reason, at, extra = {}) => ({
    id,
    targetType,
    targetId,
    reporterId,
    authorUserId,
    snapshot,
    reason,
    details: '',
    status: 'open',
    createdAt: ago(at),
    ...extra,
  });
  const resolved = (at) => ({ status: 'resolved', outcome: 'removed', resolvedBy: ADMIN_ID, resolvedAt: ago(at) });
  const reports = [
    // Đang chờ
    report('rp_qa4a', 'comment', 'c_qa4', 'u1', 'u_quanganh', 'Get 10K followers in 1 day 👉 bit.ly/yyyy', 'spam', 4 * HOUR_MS, { details: 'Same link under many songs' }),
    report('rp_qa4b', 'comment', 'c_qa4', 'u2', 'u_quanganh', 'Get 10K followers in 1 day 👉 bit.ly/yyyy', 'spam', 3 * HOUR_MS),
    report('rp_song1', 'song', reportedSongId, 'u1', 'u3', 'Ocean Breeze', 'copyright', 6 * HOUR_MS, { details: 'Sounds exactly like another artist’s song' }),
    report('rp_post1', 'post', reportedPostId, 'u2', 'u3', 'Recorded this acoustic track late last night…', 'other', DAY_MS),
    // Đã xử lý (lịch sử)
    ...qaRemoved.map(([, cid, text, rule, at], i) => report(`rp_qa${i + 1}`, 'comment', cid, 'u1', 'u_quanganh', text, rule, at + HOUR_MS, resolved(at))),
  ];

  const notifications = qaRemoved.map(([, , text, rule, at], i) => ({
    id: `n_qa${i + 1}`,
    userId: 'u_quanganh',
    type: 'content_removed',
    actorName: 'MusicStream',
    postId: commentPostId,
    targetType: 'comment',
    rule,
    violationCount: i + 1,
    text,
    read: i < 2,
    createdAt: ago(at),
  }));

  const action = (id, adminId, act, targetType, targetId, targetLabel, rule, note, at) => ({
    id, adminId, action: act, targetType, targetId, targetLabel, rule, note, createdAt: ago(at),
  });
  const adminActions = [
    action('aa_1', ADMIN_ID, 'remove_content', 'comment', 'c_qa1', 'Check my channel for free followers!!!', 'spam', '', 9 * DAY_MS),
    action('aa_2', ADMIN_ID, 'remove_content', 'comment', 'c_qa2', 'You sing like a dying cat, quit music', 'harassment', '', 4 * DAY_MS),
    action('aa_3', ADMIN_ID, 'remove_content', 'comment', 'c_sb3', 'Cheap streams 1000 plays = $1', 'spam', '', DAY_MS),
    action('aa_4', ADMIN_ID, 'lock', 'user', 'u_tk', 'T.K Beats', 'scam', 'Asking fans for bank transfers', 2 * HOUR_MS),
    action('aa_5', ADMIN_ID, 'remove_content', 'comment', 'c_qa3', 'Buy followers at cheap price 👉 bit.ly/xxxx', 'spam', '', 2 * HOUR_MS - 60000),
    action('aa_6', ADMIN_ID, 'remove_content', 'comment', 'c_sb4', 'Promote your song here, DM me', 'spam', '', HOUR_MS),
    action('aa_7', null, 'auto_lock', 'user', 'u_spambot', 'spam_bot_22', 'spam', '4 violations', HOUR_MS - 1000),
  ];

  return { users, artists, songs, comments, violations, reports, notifications, adminActions };
};

module.exports = { buildDemoModeration };
