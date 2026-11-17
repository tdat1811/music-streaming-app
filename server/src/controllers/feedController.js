const { lockedUserIds } = require('../services/moderation');
const FeedPost = require('../models/FeedPost');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Artist = require('../models/Artist');
const Song = require('../models/Song');
const { validatePostInput, POST_LIMITS } = require('../utils/postValidation');
const { notifyFollowers } = require('../services/followers');
const { makeId } = require('../utils/ids');

// userId lấy từ token đăng nhập (req.userId), không tin dữ liệu client gửi lên.

// Tìm tài khoản tác giả của bình luận. Bình luận mới lưu userId; dữ liệu mẫu cũ chỉ có tên
// nên thử tìm theo tên, và chỉ nhận khi đúng một tài khoản mang tên đó (tránh gửi nhầm người).
const findCommentAuthorId = async (comment) => {
  if (comment.userId) return comment.userId;
  if (!comment.userName) return null;
  const users = await User.find({ name: comment.userName }).select('id').limit(2);
  return users.length === 1 ? users[0].id : null;
};

// Tạo thông báo "X đã trả lời bình luận của bạn" (không tự thông báo cho chính mình)
const notifyCommentReply = async ({ targetComment, rootCommentId, reply, actorId }) => {
  const recipientId = await findCommentAuthorId(targetComment);
  if (!recipientId || recipientId === actorId) return;
  await Notification.create({
    id: makeId('n'),
    userId: recipientId,
    type: 'comment_reply',
    actorId,
    actorName: reply.userName,
    postId: reply.postId,
    commentId: rootCommentId,
    targetCommentId: targetComment.id,
    replyId: reply.id,
    text: reply.text,
  });
};

// Lấy tên / ảnh tác giả từ Artist thật (bài cũ chưa có authorArtistId giữ nguyên tên đã lưu).
// Nhờ vậy nghệ sĩ đổi tên hoặc ảnh đại diện thì mọi bài đăng cũ cũng hiển thị theo.
const attachAuthors = async (posts) => {
  const artistIds = [...new Set(posts.map((p) => p.authorArtistId).filter(Boolean))];
  const artists = artistIds.length
    ? await Artist.find({ id: { $in: artistIds } }).select('id name avatarImage isVerified')
    : [];
  const byId = new Map(artists.map((a) => [a.id, a]));
  return posts.map((post) => {
    const obj = post.toObject();
    const artist = obj.authorArtistId ? byId.get(obj.authorArtistId) : null;
    if (artist) {
      obj.authorName = artist.name;
      obj.authorAvatar = artist.avatarImage || obj.authorAvatar;
      obj.authorVerified = !!artist.isVerified;
    }
    return obj;
  });
};
exports.attachAuthors = attachAuthors;

// Lấy danh sách bài post trên Feed (mới nhất trước).
// ?scope=following: chỉ bài của nghệ sĩ người xem đang theo dõi (cần đăng nhập)
// ?artistId=...: chỉ bài của một nghệ sĩ (Posts trên trang nghệ sĩ / "My posts")
exports.getFeedPosts = async (req, res) => {
  try {
    // Bài bị admin gỡ / đang tạm ẩn (trang nghệ sĩ bị ẩn, chủ trang bị khoá) không hiện
    const filter = { ...FeedPost.PUBLIC_POST_FILTER };
    if (req.query.artistId) filter.authorArtistId = String(req.query.artistId);
    if (req.query.scope === 'following') {
      if (!req.userId) return res.status(401).json({ success: false, code: 'TOKEN_MISSING', message: 'Vui lòng đăng nhập để xem bài từ nghệ sĩ bạn theo dõi.' });
      const me = await User.findOne({ id: req.userId }).select('followedArtistIds').lean();
      filter.authorArtistId = { $in: me?.followedArtistIds || [] };
    }
    const posts = await FeedPost.find(filter).sort({ createdAt: -1 });
    const data = await attachAuthors(posts);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------------- Nghệ sĩ đăng / sửa / xoá bài (route đã qua requireAuth + requireRole('artist'))

const findOwnArtist = (req) =>
  req.user.artistId ? Artist.findOne({ id: req.user.artistId, ownerUserId: req.user.id }) : null;

// Bài hát gắn kèm phải là bài đã đăng của chính nghệ sĩ
const checkAttachedSong = async (artist, songId) => {
  if (!songId) return null;
  const song = await Song.findOne({ id: songId, artistId: artist.id, status: 'published', removedAt: null }).select('id').lean();
  return song ? null : 'You can only attach one of your published songs.';
};

const postResponse = async (post) => (await attachAuthors([post]))[0];

exports.createPost = async (req, res) => {
  try {
    const artist = await findOwnArtist(req);
    if (!artist) return res.status(403).json({ success: false, message: 'Tài khoản chưa được gắn với trang nghệ sĩ nào.' });
    if (artist.hiddenAt) {
      return res.status(403).json({ success: false, code: 'PAGE_HIDDEN', message: 'Your artist page is hidden by a moderator. You can’t post right now.' });
    }
    const { errors, value } = validatePostInput(req.body);
    const songError = await checkAttachedSong(artist, value.songId);
    if (songError) errors.songId = songError;
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, code: 'INVALID', message: Object.values(errors)[0], errors });
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const today = await FeedPost.countDocuments({ authorArtistId: artist.id, createdAt: { $gte: since } });
    if (today >= POST_LIMITS.perDay) {
      return res.status(429).json({ success: false, code: 'POST_LIMIT', message: `You can post at most ${POST_LIMITS.perDay} times a day.` });
    }
    const post = await FeedPost.create({
      id: makeId('fp'),
      authorArtistId: artist.id,
      authorName: artist.name,
      authorAvatar: artist.avatarImage || '',
      content: value.content,
      songId: value.songId,
      // App tự tính "2m", "3h" từ createdAt khi timeAgo rỗng
      timeAgo: '',
      likes: 0,
      likedByUserIds: [],
      shares: 0,
    });
    // Báo người theo dõi (trừ khi được gọi nội bộ từ "Share to feed" – khi đó đã báo "bài hát mới")
    if (!req.silentNotify) {
      await notifyFollowers(artist, { type: 'artist_new_post', postId: post.id, text: value.content.slice(0, 120) });
    }
    res.status(201).json({ success: true, message: 'Posted.', data: await postResponse(post) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const artist = await findOwnArtist(req);
    const post = artist ? await FeedPost.findOne({ id: req.params.id, authorArtistId: artist.id }) : null;
    if (!post) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
    if (post.removedAt) {
      return res.status(403).json({ success: false, code: 'POST_REMOVED', message: "This post was removed by a moderator and can't be edited." });
    }
    const { errors, value } = validatePostInput(req.body);
    // Bài hát đã gắn từ trước (có thể đã bị ẩn) vẫn được giữ nguyên khi sửa chữ
    if (value.songId && value.songId !== post.songId) {
      const songError = await checkAttachedSong(artist, value.songId);
      if (songError) errors.songId = songError;
    }
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, code: 'INVALID', message: Object.values(errors)[0], errors });
    }
    post.content = value.content;
    post.songId = value.songId;
    post.editedAt = new Date();
    await post.save();
    res.status(200).json({ success: true, message: 'Saved.', data: await postResponse(post) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Xoá bài: xoá luôn bình luận và thông báo trỏ tới bài đó
exports.deletePost = async (req, res) => {
  try {
    const artist = await findOwnArtist(req);
    const post = artist ? await FeedPost.findOneAndDelete({ id: req.params.id, authorArtistId: artist.id }) : null;
    if (!post) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
    const [comments] = await Promise.all([
      Comment.deleteMany({ postId: post.id }),
      Notification.deleteMany({ postId: post.id }),
    ]);
    res.status(200).json({ success: true, message: 'Deleted.', deletedComments: comments.deletedCount ?? 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Thả tim / Bỏ thích bài post trên Feed
exports.togglePostLike = async (req, res) => {
  try {
    const userId = req.userId;
    const { postId } = req.body;
    const post = await FeedPost.findOne({ id: postId });
    if (!post) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });

    const isLiked = post.likedByUserIds.includes(userId);
    if (isLiked) {
      post.likedByUserIds = post.likedByUserIds.filter((id) => id !== userId);
      post.likes = Math.max(0, post.likes - 1);
    } else {
      post.likedByUserIds.push(userId);
      post.likes += 1;
    }
    await post.save();

    res.status(200).json({
      success: true,
      isLiked: !isLiked,
      likes: post.likes,
      likedByUserIds: post.likedByUserIds,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Tăng số lượt chia sẻ
exports.sharePost = async (req, res) => {
  try {
    const { postId } = req.body;
    const post = await FeedPost.findOne({ id: postId });
    if (!post) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });

    post.shares += 1;
    await post.save();

    res.status(200).json({ success: true, shares: post.shares });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy danh sách bình luận của 1 bài viết (kèm nested replies)
// Tài khoản sở hữu trang nghệ sĩ đã đăng bài: bình luận của họ (cả trả lời) có nhãn Artist
// Đồng thời bỏ các câu trả lời bị admin gỡ hoặc của tài khoản đang bị khoá (giai đoạn 5)
const artistMarker = async (postId, lockedIds = null) => {
  const post = await FeedPost.findOne({ id: postId }).select('authorArtistId').lean();
  const artist = post?.authorArtistId ? await Artist.findOne({ id: post.authorArtistId }).select('ownerUserId').lean() : null;
  const ownerId = artist?.ownerUserId || null;
  const locked = new Set(lockedIds || (await lockedUserIds()));
  const mark = (c) => ({ ...c, isArtist: !!ownerId && c.userId === ownerId });
  const visible = (c) => !c.removedAt && !(c.userId && locked.has(c.userId));
  return (doc) => {
    const obj = mark(doc.toObject ? doc.toObject() : doc);
    obj.replies = (obj.replies || []).filter(visible).map(mark);
    return obj;
  };
};

exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const locked = await lockedUserIds();
    // Bình luận bị gỡ (kèm cả thread trả lời) và bình luận của tài khoản bị khoá không hiện
    const comments = await Comment.find({ postId, removedAt: null, userId: { $nin: locked } }).sort({ createdAt: 1 });
    const markAll = await artistMarker(postId, locked);

    // Tính tổng số bình luận (gồm cả reply)
    const data = comments.map(markAll);
    const totalCount = data.reduce((sum, c) => sum + 1 + (c.replies ? c.replies.length : 0), 0);

    res.status(200).json({
      success: true,
      totalCount,
      data,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Thêm bình luận mới (hỗ trợ cả bình luận gốc và trả lời lồng nhau)
exports.addComment = async (req, res) => {
  try {
    const { postId, userAvatar, text, replyTarget } = req.body;
    if (!postId || !text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Nội dung bình luận không được rỗng.' });
    }

    // Tên người bình luận lấy từ tài khoản đăng nhập để không giả mạo được tên người khác
    const author = await User.findOne({ id: req.userId }).select('name');
    if (!author) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    const userName = author.name;

    // Không bình luận vào bài đã bị gỡ / đang tạm ẩn
    if (!(await FeedPost.exists({ id: postId, ...FeedPost.PUBLIC_POST_FILTER }))) {
      return res.status(404).json({ success: false, message: 'This post is no longer available.' });
    }

    const trimmedText = text.trim();
    const commentId = makeId('c');

    // Nếu là câu trả lời cho bình luận con (nested reply)
    if (replyTarget && replyTarget.rootCommentId) {
      const parentComment = await Comment.findOne({ id: replyTarget.rootCommentId, removedAt: null });
      if (!parentComment) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận gốc.' });
      }

      // Bình luận đang được trả lời: chính bình luận gốc hoặc một câu trả lời trong thread
      const targetComment =
        (replyTarget.commentId &&
          parentComment.replies.find((r) => r.id === replyTarget.commentId)) ||
        parentComment;

      const newReply = {
        id: commentId,
        postId,
        userId: req.userId,
        userName: userName || 'User',
        userAvatar: userAvatar || '',
        text: trimmedText,
        timeAgo: 'Just now',
        likes: 0,
        likedByUserIds: [],
        replyToName: replyTarget.userName || '',
        createdAt: new Date(),
      };

      parentComment.replies.push(newReply);
      await parentComment.save();

      // Gửi thông báo cho tác giả bình luận được trả lời (lỗi ở đây không làm hỏng việc gửi bình luận)
      try {
        await notifyCommentReply({
          targetComment,
          rootCommentId: parentComment.id,
          reply: newReply,
          actorId: req.userId,
        });
      } catch (notifyErr) {
        console.error('Không tạo được thông báo trả lời bình luận:', notifyErr.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Gửi phản hồi thành công!',
        data: (await artistMarker(postId))(parentComment),
      });
    }

    // Nếu là bình luận gốc mới
    const newComment = await Comment.create({
      id: commentId,
      postId,
      userId: req.userId,
      userName: userName || 'User',
      userAvatar: userAvatar || '',
      text: trimmedText,
      timeAgo: 'Just now',
      likes: 0,
      likedByUserIds: [],
      replies: [],
    });

    res.status(201).json({
      success: true,
      message: 'Gửi bình luận thành công!',
      data: (await artistMarker(postId))(newComment),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Thả tim bình luận hoặc phản hồi
exports.toggleCommentLike = async (req, res) => {
  try {
    const userId = req.userId;
    const { commentId } = req.body;

    // Tìm trong bình luận gốc
    let comment = await Comment.findOne({ id: commentId });
    if (comment) {
      const isLiked = comment.likedByUserIds.includes(userId);
      if (isLiked) {
        comment.likedByUserIds = comment.likedByUserIds.filter((id) => id !== userId);
        comment.likes = Math.max(0, comment.likes - 1);
      } else {
        comment.likedByUserIds.push(userId);
        comment.likes += 1;
      }
      await comment.save();
      return res.status(200).json({ success: true, isLiked: !isLiked, likes: comment.likes });
    }

    // Nếu không thấy, tìm trong các replies con
    const parentComment = await Comment.findOne({ 'replies.id': commentId });
    if (parentComment) {
      const reply = parentComment.replies.find((r) => r.id === commentId);
      if (reply) {
        const isLiked = reply.likedByUserIds.includes(userId);
        if (isLiked) {
          reply.likedByUserIds = reply.likedByUserIds.filter((id) => id !== userId);
          reply.likes = Math.max(0, reply.likes - 1);
        } else {
          reply.likedByUserIds.push(userId);
          reply.likes += 1;
        }
        await parentComment.save();
        return res.status(200).json({ success: true, isLiked: !isLiked, likes: reply.likes });
      }
    }

    res.status(404).json({ success: false, message: 'Không tìm thấy bình luận.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
