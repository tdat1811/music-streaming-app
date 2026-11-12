const FeedPost = require('../models/FeedPost');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
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

// Lấy danh sách bài post trên Feed
exports.getFeedPosts = async (req, res) => {
  try {
    const posts = await FeedPost.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: posts.length, data: posts });
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
exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ postId }).sort({ createdAt: 1 });

    // Tính tổng số bình luận (gồm cả reply)
    let totalCount = 0;
    comments.forEach((c) => {
      totalCount += 1 + (c.replies ? c.replies.length : 0);
    });

    res.status(200).json({
      success: true,
      totalCount,
      data: comments,
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

    const trimmedText = text.trim();
    const commentId = makeId('c');

    // Nếu là câu trả lời cho bình luận con (nested reply)
    if (replyTarget && replyTarget.rootCommentId) {
      const parentComment = await Comment.findOne({ id: replyTarget.rootCommentId });
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
        data: parentComment,
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
      data: newComment,
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
