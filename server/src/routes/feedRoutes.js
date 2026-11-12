const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { requireAuth } = require('../middleware/auth');

router.get('/posts', feedController.getFeedPosts);
// Đọc bảng tin không cần đăng nhập; thả tim, chia sẻ, bình luận thì cần token
router.post('/posts/like', requireAuth, feedController.togglePostLike);
router.post('/posts/share', requireAuth, feedController.sharePost);

router.get('/comments/:postId', feedController.getComments);
router.post('/comments', requireAuth, feedController.addComment);
router.post('/comments/like', requireAuth, feedController.toggleCommentLike);

module.exports = router;
