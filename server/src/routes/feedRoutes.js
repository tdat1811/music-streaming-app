const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');

router.get('/posts', optionalAuth, feedController.getFeedPosts);
// Nghệ sĩ đăng / sửa / xoá bài của chính mình
router.post('/posts', requireAuth, requireRole('artist'), feedController.createPost);
router.put('/posts/:id', requireAuth, requireRole('artist'), feedController.updatePost);
router.delete('/posts/:id', requireAuth, requireRole('artist'), feedController.deletePost);
// Đọc bảng tin không cần đăng nhập; thả tim, chia sẻ, bình luận thì cần token
router.post('/posts/like', requireAuth, feedController.togglePostLike);
// Khách (chưa đăng nhập) cũng chia sẻ được và lượt chia sẻ được lưu (Bảng 1.2) – BUG04
router.post('/posts/share', feedController.sharePost);

router.get('/comments/:postId', feedController.getComments);
router.post('/comments', requireAuth, feedController.addComment);
router.post('/comments/like', requireAuth, feedController.toggleCommentLike);

module.exports = router;
