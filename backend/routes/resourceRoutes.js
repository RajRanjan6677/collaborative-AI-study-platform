const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const path = require('path');
const resourceController = require('../controllers/resourceController');
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

router.get('/', resourceController.getResources);
router.post('/', upload.single('file'), resourceController.addResource);
router.delete('/:resourceId', resourceController.deleteResource);

module.exports = router;
