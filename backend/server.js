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

// Allow multiple Vercel preview URLs
const getAllowedOrigins = () => {
  const mainUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  return [
    mainUrl,
    mainUrl.replace(/\/$/, ''), // Remove trailing slash
    'https://borrow-on-rent-website-zdma.vercel.app',
    'https://borrow-on-rent-website-zdma-git-main-stud2000s-projects.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ];
};

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    console.log('📍 Request origin:', origin);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('❌ CORS blocked origin:', origin);
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const io = new Server(server, {
  cors: corsOptions
});

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running! ✅', timestamp: new Date() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'BorrowLocal API Server', version: '1.0.0', mongoConnected: mongoose.connection.readyState === 1 });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ message: 'Internal server error', error: err.message });
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
      console.log('✅ CORS enabled for Vercel frontend URLs');
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('❌ Check your MONGO_URI in .env file');
    console.error('❌ Make sure your IP is whitelisted in MongoDB Atlas Network Access');
    process.exit(1);
  });
