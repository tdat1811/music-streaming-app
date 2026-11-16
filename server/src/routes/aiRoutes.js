// server/src/routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// GET /api/ai/moods - Lấy danh sách preset tâm trạng gợi ý
router.get('/moods', aiController.getMoodPresets);

// POST /api/ai/chat - Trò chuyện với AI & nhận gợi ý bài hát theo cảm xúc
router.post('/chat', aiController.chatWithAI);

module.exports = router;
