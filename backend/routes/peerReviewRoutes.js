const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const path = require('path');
const peerReviewController = require('../controllers/peerReviewController');
const { verifyToken } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

router.use(verifyToken);

router.get('/', peerReviewController.getSubmissions);
router.post('/', upload.single('file'), peerReviewController.createSubmission);
router.get('/:submissionId/reviews', peerReviewController.getReviews);
router.post('/:submissionId/reviews', peerReviewController.submitReview);

module.exports = router;
