const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const Item = require('../models/Item');
const { protect } = require('../middleware/auth');

// ─── Cloudinary Config ────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'borrow-app',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 600, crop: 'limit' }]
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── GET ALL ITEMS (with search, filter, nearby) ──────────────────────────────
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

// ─── GET SINGLE ITEM ──────────────────────────────────────────────────────────
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

// ─── CREATE ITEM ──────────────────────────────────────────────────────────────
router.post('/', protect, upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, category, condition, borrowDuration, neighborhood, tags, lat, lng } = req.body;

    // Cloudinary returns full https:// URLs in f.path
    const images = req.files ? req.files.map(f => f.path) : [];

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

// ─── UPDATE ITEM ──────────────────────────────────────────────────────────────
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

// ─── DELETE ITEM (also deletes images from Cloudinary) ───────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    // Delete images from Cloudinary
    if (item.images && item.images.length > 0) {
      const deletePromises = item.images.map(imageUrl => {
        // Extract public_id from URL e.g. "borrow-app/abc123"
        const parts = imageUrl.split('/');
        const filename = parts[parts.length - 1].split('.')[0];
        const folder = parts[parts.length - 2];
        const publicId = `${folder}/${filename}`;
        return cloudinary.uploader.destroy(publicId);
      });
      await Promise.allSettled(deletePromises); // don't fail if image delete fails
    }

    await item.deleteOne();
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── MY ITEMS ─────────────────────────────────────────────────────────────────
router.get('/user/my', protect, async (req, res) => {
  try {
    const items = await Item.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
