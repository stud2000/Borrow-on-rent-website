const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

console.log('🔧 Starting server...');
console.log('📍 PORT:', process.env.PORT);
console.log('📍 MONGO_URI:', process.env.MONGO_URI ? 'Set' : 'NOT SET');
console.log('📍 CLIENT_URL:', process.env.CLIENT_URL);
console.log('📍 CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'Set ✅' : 'NOT SET ❌');
console.log('📍 CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Set ✅' : 'NOT SET ❌');
console.log('📍 CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Set ✅' : 'NOT SET ❌');

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') console.log('📍 Request origin:', req.headers.origin);
  next();
});

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: [
      'https://borrow-on-rent-website-zdma.vercel.app',
      'https://borrow-on-rent-website-zdma-git-main-stud2000s-projects.vercel.app'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running! ✅', timestamp: new Date() });
});

app.get('/', (req, res) => {
  res.json({
    message: 'BorrowLocal API Server',
    version: '1.0.0',
    mongoConnected: mongoose.connection.readyState === 1
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));

app.get('/api/test', (req, res) => {
  res.json({ message: 'API works' });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ message: 'CORS not allowed', error: err.message });
  }
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// ─── Socket events ────────────────────────────────────────────────────────────
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
    onlineUsers.forEach((id, userId) => {
      if (id === socket.id) onlineUsers.delete(userId);
    });
  });
});
app.set('io', io);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📍 API ready at: http://localhost:${PORT}/api`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
