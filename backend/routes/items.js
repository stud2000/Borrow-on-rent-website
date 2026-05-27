const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Item = require('../models/Item');
const { protect } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Get all items (with search, filter, nearby)
router.get('/', async (req, res) => {
  try {
    const { search, category, status, lat, lng, radius = 10, page = 1, limit = 12 } = req.query;
    let query = {};

    if (search) query.$text = { $search: search };
    if (category) query.category = category;
    if (status) query.status = status;

    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseFloat(radius) * 1000
        }
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Item.countDocuments(query);
    const items = await Item.find(query)
      .populate('owner', 'name avatar rating neighborhood phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ items, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single item
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id, { $inc: { views: 1 } }, { new: true }
    ).populate('owner', 'name avatar rating ratingCount neighborhood phone bio');
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create item
router.post('/', protect, upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, category, condition, borrowDuration, neighborhood, tags, lat, lng } = req.body;
    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    const item = await Item.create({
      title, description, category, condition, borrowDuration,
      neighborhood, tags: tags ? JSON.parse(tags) : [],
      images,
      owner: req.user._id,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng) || 0, parseFloat(lat) || 0]
      }
    });
    const populated = await item.populate('owner', 'name avatar rating neighborhood');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update item
router.put('/:id', protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    const updated = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('owner', 'name avatar rating neighborhood');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete item
router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    await item.deleteOne();
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// My items
router.get('/user/my', protect, async (req, res) => {
  try {
    const items = await Item.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
