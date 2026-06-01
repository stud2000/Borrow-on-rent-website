const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const sendMail = require('../utils/mailer');

const generateToken = (id, expiresIn = '30d') =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, neighborhood } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: 'Invalid email format' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, phone: phone || '', password, neighborhood: neighborhood || '' });
    const token = generateToken(user._id);

    // Send welcome email asynchronously (don't block response)
    (async () => {
      try {
        await sendMail({
          to: user.email,
          subject: 'Welcome to BorrowLocal — Account created',
          text: `Hi ${user.name},\n\nYour BorrowLocal account has been created successfully.\n\nThanks,\nBorrowLocal Team`,
          html: `<p>Hi ${user.name},</p><p>Your BorrowLocal account has been created successfully.</p><p>Thanks,<br/>BorrowLocal Team</p>`
        });
      } catch (e) {
        console.error('Registration email failed:', e);
      }
    })();

    res.status(201).json({ token, user, expiresIn: '30d' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login (strict email + password)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

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
