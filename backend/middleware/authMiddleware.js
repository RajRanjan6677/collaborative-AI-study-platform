const jwt = require('jsonwebtoken');
const db = require('../db');

exports.verifyToken = (req, res, next) => {
  let token = req.headers.authorization;
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  if (token.startsWith('Bearer ')) {
    token = token.slice(7, token.length);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production');
    req.user = decoded; // { userId, role }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized, token failed' });
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    next();
  } else {
    res.status(403).json({ message: 'Require Admin Role' });
  }
};

exports.isSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({ message: 'Require Super Admin Role' });
  }
};

exports.isRoomAdmin = async (req, res, next) => {
  try {
    const roomId = req.params.roomId || req.body.roomId;
    if (!roomId) {
      return res.status(400).json({ message: 'Room ID is required' });
    }

    if (req.user.role === 'superadmin') {
      return next();
    }

    const [members] = await db.execute('SELECT room_role FROM RoomMembers WHERE room_id = ? AND user_id = ?', [roomId, req.user.userId]);
    
    if (members.length === 0) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    if (members[0].room_role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Require Room Admin Role' });
    }
  } catch (error) {
    console.error('isRoomAdmin Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
