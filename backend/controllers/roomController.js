const crypto = require('crypto');
const db = require('../db');

exports.createRoom = async (req, res) => {
  try {
    const { name, topic, maxCapacity } = req.body;
    const userId = req.user.userId;

    // Generate unique invite token
    const inviteToken = crypto.randomBytes(8).toString('hex');
    const capacity = maxCapacity || 10;

    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const [roomResult] = await connection.execute(
        'INSERT INTO Rooms (name, topic, invite_token, creator_id, max_capacity) VALUES (?, ?, ?, ?, ?)',
        [name, topic, inviteToken, userId, capacity]
      );

      const roomId = roomResult.insertId;

      await connection.execute(
        'INSERT INTO RoomMembers (room_id, user_id, room_role) VALUES (?, ?, ?)',
        [roomId, userId, 'admin']
      );

      await connection.commit();
      res.status(201).json({ message: 'Room created successfully', roomId, inviteToken });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('createRoom Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.joinRoom = async (req, res) => {
  try {
    const { inviteToken } = req.body;
    const userId = req.user.userId;

    const [rooms] = await db.execute('SELECT id, max_capacity FROM Rooms WHERE invite_token = ?', [inviteToken]);
    if (rooms.length === 0) {
      return res.status(404).json({ message: 'Invalid invite token' });
    }

    const room = rooms[0];

    // Check if already a member
    const [members] = await db.execute('SELECT * FROM RoomMembers WHERE room_id = ? AND user_id = ?', [room.id, userId]);
    if (members.length > 0) {
      return res.status(400).json({ message: 'You are already in this room', roomId: room.id });
    }

    // Check capacity
    const [memberCount] = await db.execute('SELECT COUNT(*) as count FROM RoomMembers WHERE room_id = ?', [room.id]);
    if (memberCount[0].count >= room.max_capacity) {
      return res.status(400).json({ message: 'Room is full' });
    }

    await db.execute('INSERT INTO RoomMembers (room_id, user_id) VALUES (?, ?)', [room.id, userId]);

    res.status(200).json({ message: 'Joined room successfully', roomId: room.id });
  } catch (error) {
    console.error('joinRoom Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getUserRooms = async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rooms] = await db.execute(`
      SELECT r.id, r.name, r.topic, rm.room_role
      FROM Rooms r
      JOIN RoomMembers rm ON r.id = rm.room_id
      WHERE rm.user_id = ?
    `, [userId]);

    res.status(200).json(rooms);
  } catch (error) {
    console.error('getUserRooms Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.inviteToRoom = async (req, res) => {
  try {
    const { roomId, contactId, roomRole = 'member' } = req.body;
    const userId = req.user.userId;

    // Check if the user sending the invite is in the room and is an admin
    const [senderCheck] = await db.execute('SELECT room_role FROM RoomMembers WHERE room_id = ? AND user_id = ?', [roomId, userId]);
    if (senderCheck.length === 0) {
      return res.status(403).json({ message: 'You are not in this room' });
    }
    
    // Check if target is already in room
    const [targetCheck] = await db.execute('SELECT * FROM RoomMembers WHERE room_id = ? AND user_id = ?', [roomId, contactId]);
    if (targetCheck.length > 0) {
      return res.status(400).json({ message: 'User is already in this room' });
    }

    // Add them to the room
    await db.execute('INSERT INTO RoomMembers (room_id, user_id, room_role) VALUES (?, ?, ?)', [roomId, contactId, roomRole]);

    // Send notification
    const [userRow] = await db.execute('SELECT username FROM Users WHERE id = ?', [userId]);
    const username = userRow[0].username;
    
    const [roomRow] = await db.execute('SELECT name FROM Rooms WHERE id = ?', [roomId]);
    const roomName = roomRow[0].name;

    const [result] = await db.execute(
      'INSERT INTO Notifications (user_id, type, message) VALUES (?, ?, ?)',
      [contactId, 'room_invite', `${username} added you to the room "${roomName}".`]
    );

    const targetSocketId = req.userSocketMap.get(contactId);
    if (targetSocketId) {
      req.io.to(targetSocketId).emit('new_notification', {
        id: result.insertId,
        type: 'room_invite',
        message: `${username} added you to the room "${roomName}".`
      });
      // Also tell their client to refresh their room list
      req.io.to(targetSocketId).emit('room_list_updated');
    }

    res.status(200).json({ message: 'User invited successfully' });
  } catch (error) {
    console.error('inviteToRoom Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    // Verify user is in room
    const [memberCheck] = await db.execute('SELECT * FROM RoomMembers WHERE room_id = ? AND user_id = ?', [roomId, userId]);
    if (memberCheck.length === 0) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    const [messages] = await db.execute(`
      SELECT m.id, m.message, m.created_at, u.username as userId
      FROM Messages m
      JOIN Users u ON m.user_id = u.id
      WHERE m.room_id = ?
      ORDER BY m.created_at ASC
    `, [roomId]);

    res.json(messages);
  } catch (error) {
    console.error('getRoomMessages Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.body;
    const userId = req.user.userId;

    await db.execute('DELETE FROM RoomMembers WHERE room_id = ? AND user_id = ?', [roomId, userId]);
    res.json({ message: 'Left room successfully' });
  } catch (error) {
    console.error('leaveRoom Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    // Verify user is an admin of this room (or superadmin of platform)
    const [memberCheck] = await db.execute('SELECT room_role FROM RoomMembers WHERE room_id = ? AND user_id = ?', [roomId, userId]);
    
    // If not in room, and not a superadmin platform-wide, deny
    if (req.user.role !== 'superadmin' && (memberCheck.length === 0 || memberCheck[0].room_role !== 'admin')) {
      return res.status(403).json({ message: 'Only room admins can delete this room' });
    }

    // Because of ON DELETE CASCADE in MySQL, deleting the room will automatically delete
    // all RoomMembers, Messages, Tasks, and Resources associated with it.
    await db.execute('DELETE FROM Rooms WHERE id = ?', [roomId]);
    
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('deleteRoom Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getRoomMembers = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    // Check membership
    const [memberCheck] = await db.execute('SELECT room_role FROM RoomMembers WHERE room_id = ? AND user_id = ?', [roomId, userId]);
    if (memberCheck.length === 0) return res.status(403).json({ message: 'Access denied' });

    const [members] = await db.execute(`
      SELECT u.id, u.username, rm.room_role, rm.joined_at
      FROM RoomMembers rm
      JOIN Users u ON rm.user_id = u.id
      WHERE rm.room_id = ?
    `, [roomId]);

    res.json(members);
  } catch (error) {
    console.error('getRoomMembers Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateMemberRole = async (req, res) => {
  try {
    const { roomId, memberId } = req.params;
    const { role } = req.body;
    const userId = req.user.userId;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Verify requester is an admin of this room
    const [requesterCheck] = await db.execute('SELECT room_role FROM RoomMembers WHERE room_id = ? AND user_id = ?', [roomId, userId]);
    if (requesterCheck.length === 0 || requesterCheck[0].room_role !== 'admin') {
      return res.status(403).json({ message: 'Only room admins can change roles' });
    }

    await db.execute('UPDATE RoomMembers SET room_role = ? WHERE room_id = ? AND user_id = ?', [role, roomId, memberId]);
    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('updateMemberRole Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
