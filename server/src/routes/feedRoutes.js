const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');

router.get('/posts', feedController.getFeedPosts);
router.post('/posts/like', feedController.togglePostLike);
router.post('/posts/share', feedController.sharePost);

router.get('/comments/:postId', feedController.getComments);
router.post('/comments', feedController.addComment);
router.post('/comments/like', feedController.toggleCommentLike);

module.exports = router;
