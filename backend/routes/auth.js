const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id, expiresIn = '30d') =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password, neighborhood } = req.body;
    if (!name || !phone || !password)
      return res.status(400).json({ message: 'Name, phone and password are required' });

    const phoneRegex = /^[+]?[\d\s\-()]{7,15}$/;
    if (!phoneRegex.test(phone))
      return res.status(400).json({ message: 'Invalid phone number format' });

    const exists = await User.findOne({ phone });
    if (exists) return res.status(400).json({ message: 'Phone number already registered' });

    const user = await User.create({ name, phone, password, neighborhood: neighborhood || '' });
    const token = generateToken(user._id);

    res.status(201).json({ token, user, expiresIn: '30d' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password)
      return res.status(400).json({ message: 'Phone and password are required' });

    const user = await User.findOne({ phone });
    if (!user) return res.status(401).json({ message: 'Invalid phone or password' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid phone or password' });

    const token = generateToken(user._id);
    res.json({ token, user, expiresIn: '30d' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user (also acts as session validator)
router.get('/me', protect, async (req, res) => {
  try {
    // Return fresh user data from DB
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Refresh token — call this before token expires to keep session alive
router.post('/refresh', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });
    const token = generateToken(user._id);
    res.json({ token, user, expiresIn: '30d' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Logout (client-side only, but good to have for future blocklist support)
router.post('/logout', protect, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
