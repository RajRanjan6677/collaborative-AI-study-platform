const express = require('express');
const router = express.Router({ mergeParams: true }); // Need mergeParams to access :roomId
const taskController = require('../controllers/taskController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);
router.put('/:taskId', taskController.updateTaskStatus);
router.delete('/:taskId', taskController.deleteTask);

module.exports = router;
