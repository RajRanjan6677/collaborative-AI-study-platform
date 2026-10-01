const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Allowed for all users
router.post('/create', roomController.createRoom);

router.post('/join', roomController.joinRoom);
router.post('/invite', roomController.inviteToRoom);
router.get('/my-rooms', roomController.getUserRooms);
router.get('/:roomId/messages', roomController.getRoomMessages);
router.post('/leave', roomController.leaveRoom);
router.delete('/:roomId', roomController.deleteRoom);

router.get('/:roomId/members', roomController.getRoomMembers);
router.put('/:roomId/members/:memberId/role', roomController.updateMemberRole);

module.exports = router;
