const db = require('../db');

exports.searchUsers = async (req, { q }) => {
  // We'll wrap this in standard req, res pattern
};

exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user.userId;
    if (!q) return res.json([]);

    const [users] = await db.execute(
      'SELECT id, username, email FROM Users WHERE (username LIKE ? OR email LIKE ?) AND id != ? LIMIT 10',
      [`%${q}%`, `%${q}%`, userId]
    );

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error searching users' });
  }
};

exports.addContact = async (req, res) => {
  try {
    const { contactId } = req.body;
    const userId = req.user.userId;

    if (userId === contactId) {
      return res.status(400).json({ message: 'Cannot add yourself' });
    }

    // Check if contact request already exists
    const [existing] = await db.execute(
      'SELECT * FROM Contacts WHERE (user_id = ? AND contact_id = ?) OR (user_id = ? AND contact_id = ?)',
      [userId, contactId, contactId, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Contact request already exists' });
    }

    await db.execute(
      'INSERT INTO Contacts (user_id, contact_id, status) VALUES (?, ?, ?)',
      [userId, contactId, 'pending']
    );

    // Create Notification
    const [userRow] = await db.execute('SELECT username FROM Users WHERE id = ?', [userId]);
    const username = userRow[0].username;
    
    const [result] = await db.execute(
      'INSERT INTO Notifications (user_id, type, message) VALUES (?, ?, ?)',
      [contactId, 'contact_request', `${username} sent you a contact request.`]
    );

    const targetSocketId = req.userSocketMap.get(contactId);
    if (targetSocketId) {
      req.io.to(targetSocketId).emit('new_notification', {
        id: result.insertId,
        type: 'contact_request',
        message: `${username} sent you a contact request.`
      });
    }

    res.status(201).json({ message: 'Contact request sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding contact' });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const userId = req.user.userId;
    // Get both sent and received contact requests
    const [contacts] = await db.execute(`
      SELECT 
        c.user_id, c.contact_id, c.status,
        u.id, u.username, u.email
      FROM Contacts c
      JOIN Users u ON (c.user_id = u.id OR c.contact_id = u.id)
      WHERE (c.user_id = ? OR c.contact_id = ?) AND u.id != ?
    `, [userId, userId, userId]);

    res.json(contacts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching contacts' });
  }
};

exports.acceptContact = async (req, res) => {
  try {
    const { contactId } = req.body;
    const userId = req.user.userId;

    await db.execute(
      'UPDATE Contacts SET status = ? WHERE user_id = ? AND contact_id = ?',
      ['accepted', contactId, userId]
    );

    // Create Notification
    const [userRow] = await db.execute('SELECT username FROM Users WHERE id = ?', [userId]);
    const username = userRow[0].username;

    const [result] = await db.execute(
      'INSERT INTO Notifications (user_id, type, message) VALUES (?, ?, ?)',
      [contactId, 'contact_accepted', `${username} accepted your contact request.`]
    );

    const targetSocketId = req.userSocketMap.get(contactId);
    if (targetSocketId) {
      req.io.to(targetSocketId).emit('new_notification', {
        id: result.insertId,
        type: 'contact_accepted',
        message: `${username} accepted your contact request.`
      });
    }

    res.status(200).json({ message: 'Contact accepted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error accepting contact' });
  }
};

exports.removeContact = async (req, res) => {
  try {
    const { contactId } = req.body;
    const userId = req.user.userId;

    await db.execute(
      'DELETE FROM Contacts WHERE (user_id = ? AND contact_id = ?) OR (user_id = ? AND contact_id = ?)',
      [userId, contactId, contactId, userId]
    );

    const targetSocketId = req.userSocketMap.get(contactId);
    if (targetSocketId) {
      req.io.to(targetSocketId).emit('contact_list_updated');
    }

    res.status(200).json({ message: 'Contact removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error removing contact' });
  }
};
