const db = require('../db');

// Helper to check room membership
const verifyMembership = async (roomId, userId) => {
  const [members] = await db.execute('SELECT * FROM RoomMembers WHERE room_id = ? AND user_id = ?', [roomId, userId]);
  return members.length > 0;
};

exports.getResources = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    if (!(await verifyMembership(roomId, userId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [resources] = await db.execute(`
      SELECT r.*, u.username as uploader_name
      FROM Resources r
      JOIN Users u ON r.uploader_id = u.id
      WHERE r.room_id = ?
      ORDER BY r.created_at DESC
    `, [roomId]);

    res.json(resources);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching resources' });
  }
};

exports.addResource = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { title, type = 'link' } = req.body;
    let { url } = req.body;
    const userId = req.user.userId;

    if (!(await verifyMembership(roomId, userId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.file) {
      // If a file was uploaded, the URL is the static path to the file
      url = `http://localhost:5000/uploads/${req.file.filename}`;
    }

    if (!url) {
      return res.status(400).json({ message: 'URL or File is required' });
    }

    const [result] = await db.execute(
      'INSERT INTO Resources (room_id, uploader_id, title, url, type) VALUES (?, ?, ?, ?, ?)',
      [roomId, userId, title, url, type]
    );

    res.status(201).json({ message: 'Resource added', resourceId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding resource' });
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const { roomId, resourceId } = req.params;
    const userId = req.user.userId;

    if (!(await verifyMembership(roomId, userId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await db.execute('DELETE FROM Resources WHERE id = ? AND room_id = ?', [resourceId, roomId]);
    res.json({ message: 'Resource deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting resource' });
  }
};
