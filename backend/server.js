const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

// Socket.IO Connection Handler
const userSocketMap = new Map();
const socketUserMap = new Map(); // socket.id -> { userId, username }
const roomUsersMap = new Map(); // roomId -> Set of usernames

// Make io and userSocketMap accessible to routes
app.use((req, res, next) => {
  req.io = io;
  req.userSocketMap = userSocketMap;
  next();
});

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const contactRoutes = require('./routes/contactRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const taskRoutes = require('./routes/taskRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const peerReviewRoutes = require('./routes/peerReviewRoutes');
const aiRoutes = require('./routes/aiRoutes');

const path = require('path');

// Basic Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', message: 'Backend is running' });
});

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/notifications', notificationRoutes);

// Nested routes for tasks and resources
app.use('/api/rooms/:roomId/tasks', taskRoutes);
app.use('/api/rooms/:roomId/resources', resourceRoutes);
app.use('/api/rooms/:roomId/submissions', peerReviewRoutes);
app.use('/api/rooms/:roomId/ai', aiRoutes);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // When a user logs in, they register their socket
  socket.on('register_user', (data) => {
    // We expect data to be { userId, username } now, but support old way for safety
    const userId = typeof data === 'object' ? data.userId : data;
    const username = typeof data === 'object' ? data.username : null;
    userSocketMap.set(userId, socket.id);
    if (username) socketUserMap.set(socket.id, { userId, username });
    console.log(`User ${userId} (${username}) registered to socket ${socket.id}`);
  });

  // When a user joins a room
  socket.on('join_room', (data) => {
    const roomId = data.roomId || data; // handle object or primitive
    const username = data.username || socketUserMap.get(socket.id)?.username;

    socket.join(roomId);
    
    // Add to roomUsersMap
    if (!roomUsersMap.has(roomId)) roomUsersMap.set(roomId, new Set());
    if (username) roomUsersMap.get(roomId).add(username);

    // Emit presence event
    socket.to(roomId).emit('room_users', Array.from(roomUsersMap.get(roomId) || []));
    socket.emit('room_users', Array.from(roomUsersMap.get(roomId) || [])); // Send to self too
  });

  socket.on('typing', (data) => {
    const { roomId, username, isTyping } = data;
    socket.to(roomId).emit('user_typing', { username, isTyping });
  });

  // When a chat message is sent
  socket.on('send_message', async (data) => {
    const { roomId, message, userId } = data; // Note: frontend sends username as userId. We should fix that later, but for now we look up user ID from username.
    
    // Broadcast to everyone in the room except the sender, WITH roomId included!
    socket.to(roomId).emit('receive_message', { roomId, message, userId });
    
    // Check if the AI is mentioned
    if (message.startsWith('@AI') || message.startsWith('/ask')) {
      // Trigger AI logic (we will implement this later)
      console.log('AI triggered by:', userId);
    }

    try {
      // Save message to DB
      const [users] = await db.execute('SELECT id FROM Users WHERE username = ?', [userId]);
      if (users.length > 0) {
        const uId = users[0].id;
        await db.execute('INSERT INTO Messages (room_id, user_id, message) VALUES (?, ?, ?)', [roomId, uId, message]);
      }
    } catch (e) {
      console.error('Error saving message:', e);
    }
  });

  socket.on('disconnect', () => {
    const userInfo = socketUserMap.get(socket.id);
    if (userInfo) {
      // Remove from all rooms they were in
      for (const [roomId, usersSet] of roomUsersMap.entries()) {
        if (usersSet.has(userInfo.username)) {
          usersSet.delete(userInfo.username);
          socket.to(roomId).emit('room_users', Array.from(usersSet));
        }
      }
      socketUserMap.delete(socket.id);
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Basic Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', message: 'Backend is running' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
