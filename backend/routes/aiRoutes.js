const express = require('express');
const router = express.Router({ mergeParams: true });
const aiController = require('../controllers/aiController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/ask', aiController.askAI);
router.post('/flashcards', aiController.generateFlashcards);

module.exports = router;
