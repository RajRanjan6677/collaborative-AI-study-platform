const db = require('../db');

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [notifications] = await db.execute(
      'SELECT * FROM Notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.body;
    const userId = req.user.userId;

    if (notificationId) {
      await db.execute('UPDATE Notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [notificationId, userId]);
    } else {
      await db.execute('UPDATE Notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
    }
    
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating notifications' });
  }
};
