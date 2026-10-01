const db = require('../db');

// Helper to check room membership
const verifyMembership = async (roomId, userId) => {
  const [members] = await db.execute('SELECT * FROM RoomMembers WHERE room_id = ? AND user_id = ?', [roomId, userId]);
  return members.length > 0;
};

exports.getTasks = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    if (!(await verifyMembership(roomId, userId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [tasks] = await db.execute(`
      SELECT t.*, u.username as creator_name
      FROM Tasks t
      JOIN Users u ON t.creator_id = u.id
      WHERE t.room_id = ?
      ORDER BY t.created_at DESC
    `, [roomId]);

    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching tasks' });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { title, description, status = 'todo', dueDate } = req.body;
    const userId = req.user.userId;

    if (!(await verifyMembership(roomId, userId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [result] = await db.execute(
      'INSERT INTO Tasks (room_id, creator_id, title, description, status, due_date) VALUES (?, ?, ?, ?, ?, ?)',
      [roomId, userId, title, description || '', status, dueDate || null]
    );

    res.status(201).json({ message: 'Task created', taskId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating task' });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { roomId, taskId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    if (!(await verifyMembership(roomId, userId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await db.execute('UPDATE Tasks SET status = ? WHERE id = ? AND room_id = ?', [status, taskId, roomId]);
    res.json({ message: 'Task status updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating task' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const { roomId, taskId } = req.params;
    const userId = req.user.userId;

    if (!(await verifyMembership(roomId, userId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await db.execute('DELETE FROM Tasks WHERE id = ? AND room_id = ?', [taskId, roomId]);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting task' });
  }
};
