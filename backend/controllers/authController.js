const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

exports.signup = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    // Check if user exists
    const [existingUsers] = await db.execute('SELECT id FROM Users WHERE email = ? OR username = ?', [email, username]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const userRole = role && ['student', 'admin', 'superadmin'].includes(role) ? role : 'student';

    const [result] = await db.execute(
      'INSERT INTO Users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, userRole]
    );

    res.status(201).json({ message: 'User created successfully', userId: result.insertId });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [users] = await db.execute('SELECT * FROM Users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
