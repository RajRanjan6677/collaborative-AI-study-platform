const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/search', contactController.searchUsers);
router.post('/add', contactController.addContact);
router.post('/accept', contactController.acceptContact);
router.post('/remove', contactController.removeContact);
router.get('/', contactController.getContacts);

module.exports = router;
