const express = require('express');
const router = express.Router();
const BorrowRequest = require('../models/BorrowRequest');
const Item = require('../models/Item');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Create borrow request
router.post('/', protect, async (req, res) => {
  try {
    const { itemId, message, startDate, endDate } = req.body;
    const item = await Item.findById(itemId).populate('owner');
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.status !== 'available') return res.status(400).json({ message: 'Item not available' });
    if (item.owner._id.toString() === req.user._id.toString())
      return res.status(400).json({ message: 'Cannot borrow your own item' });

    const existing = await BorrowRequest.findOne({
      item: itemId, requester: req.user._id, status: 'pending'
    });
    if (existing) return res.status(400).json({ message: 'Request already sent' });

    const request = await BorrowRequest.create({
      item: itemId, requester: req.user._id,
      owner: item.owner._id, message, startDate, endDate
    });
    const populated = await request.populate([
      { path: 'item', select: 'title images category' },
      { path: 'requester', select: 'name avatar phone' },
      { path: 'owner', select: 'name avatar phone' }
    ]);
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get my requests (as borrower)
router.get('/my', protect, async (req, res) => {
  try {
    const requests = await BorrowRequest.find({ requester: req.user._id })
      .populate('item', 'title images category status')
      .populate('owner', 'name avatar phone')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get incoming requests (as owner)
router.get('/incoming', protect, async (req, res) => {
  try {
    const requests = await BorrowRequest.find({ owner: req.user._id })
      .populate('item', 'title images category')
      .populate('requester', 'name avatar phone neighborhood')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update request status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const request = await BorrowRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const isOwner = request.owner.toString() === req.user._id.toString();
    const isRequester = request.requester.toString() === req.user._id.toString();

    if (!isOwner && !isRequester) return res.status(403).json({ message: 'Not authorized' });
    if (isRequester && status !== 'cancelled') return res.status(403).json({ message: 'Not authorized' });

    request.status = status;
    await request.save();

    if (status === 'approved') {
      await Item.findByIdAndUpdate(request.item, { status: 'borrowed' });
      await User.findByIdAndUpdate(req.user._id, { $inc: { itemsLent: 1 } });
    }
    if (status === 'returned') {
      await Item.findByIdAndUpdate(request.item, { status: 'available' });
      await User.findByIdAndUpdate(request.requester, { $inc: { itemsBorrowed: 1 } });
    }

    const populated = await request.populate([
      { path: 'item', select: 'title images category' },
      { path: 'requester', select: 'name avatar phone' },
      { path: 'owner', select: 'name avatar phone' }
    ]);
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Rate after return
router.put('/:id/rate', protect, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const request = await BorrowRequest.findById(req.params.id);
    if (!request || request.status !== 'returned')
      return res.status(400).json({ message: 'Can only rate returned items' });

    const isOwner = request.owner.toString() === req.user._id.toString();
    const isRequester = request.requester.toString() === req.user._id.toString();

    if (isOwner) {
      request.borrowerRating = rating;
      request.borrowerReview = review;
      const user = await User.findById(request.requester);
      user.rating = ((user.rating * user.ratingCount) + rating) / (user.ratingCount + 1);
      user.ratingCount += 1;
      await user.save();
    } else if (isRequester) {
      request.ownerRating = rating;
      request.ownerReview = review;
      const user = await User.findById(request.owner);
      user.rating = ((user.rating * user.ratingCount) + rating) / (user.ratingCount + 1);
      user.ratingCount += 1;
      await user.save();
    }

    await request.save();
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
