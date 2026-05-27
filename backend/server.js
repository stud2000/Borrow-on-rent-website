const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({ 
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running! ✅', timestamp: new Date() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'BorrowLocal API Server', version: '1.0.0' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const onlineUsers = new Map();
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.join(userId);
  });
  socket.on('sendMessage', ({ to, from, message, conversationId }) => {
    io.to(to).emit('receiveMessage', { from, message, conversationId, createdAt: new Date() });
  });
  socket.on('disconnect', () => {
    onlineUsers.forEach((id, userId) => { if (id === socket.id) onlineUsers.delete(userId); });
  });
});
app.set('io', io);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  });
