const express = require('express');
const router = express.Router();
const BorrowRequest = require('../models/BorrowRequest');
const Item = require('../models/Item');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const sendMail = require('../utils/mailer');

// ─── CREATE BORROW REQUEST ────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { itemId, message, startDate, endDate } = req.body;
    const item = await Item.findById(itemId).populate('owner');
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.status !== 'available') return res.status(400).json({ message: 'Item not available' });
    if (item.owner._id.toString() === req.user._id.toString())
      return res.status(400).json({ message: 'Cannot borrow your own item' });

    const existing = await BorrowRequest.findOne({ item: itemId, requester: req.user._id, status: 'pending' });
    if (existing) return res.status(400).json({ message: 'Request already sent' });

    const request = await BorrowRequest.create({
      item: itemId, requester: req.user._id, owner: item.owner._id, message, startDate, endDate
    });

    // Notify owner by email
    try {
      await sendMail({
        to: item.owner.email,
        subject: `New borrow request for "${item.title}"`,
        html: `<p>Hi ${item.owner.name},</p>
               <p><b>${req.user.name}</b> wants to borrow your item <b>${item.title}</b>.</p>
               <p>Message: ${message || 'No message'}</p>
               <p>Dates: ${startDate} → ${endDate}</p>
               <p>Login to approve or reject the request.</p>`
      });
    } catch (e) { console.error('Email failed:', e.message); }

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

// ─── GET MY REQUESTS (as borrower) ───────────────────────────────────────────
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

// ─── GET INCOMING REQUESTS (as owner) ────────────────────────────────────────
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

// ─── APPROVE / REJECT / CANCEL ───────────────────────────────────────────────
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const request = await BorrowRequest.findById(req.params.id)
      .populate('requester', 'name email')
      .populate('owner', 'name email')
      .populate('item', 'title');

    if (!request) return res.status(404).json({ message: 'Request not found' });

    const isOwner = request.owner._id.toString() === req.user._id.toString();
    const isRequester = request.requester._id.toString() === req.user._id.toString();

    if (!isOwner && !isRequester) return res.status(403).json({ message: 'Not authorized' });
    if (isRequester && status !== 'cancelled') return res.status(403).json({ message: 'Only owner can change this status' });
    if (isOwner && !['approved', 'rejected'].includes(status))
      return res.status(403).json({ message: 'Owner can only approve or reject here' });

    request.status = status;
    await request.save();

    if (status === 'approved') {
      await Item.findByIdAndUpdate(request.item._id, { status: 'borrowed' });
      await User.findByIdAndUpdate(request.owner._id, { $inc: { itemsLent: 1 } });

      // Notify borrower
      try {
        await sendMail({
          to: request.requester.email,
          subject: `Your request for "${request.item.title}" was approved! ✅`,
          html: `<p>Hi ${request.requester.name},</p>
                 <p>Great news! <b>${request.owner.name}</b> approved your request to borrow <b>${request.item.title}</b>.</p>
                 <p>When you're done using it, go to your dashboard and click <b>"Request Return"</b> to initiate the return process.</p>`
        });
      } catch (e) { console.error('Email failed:', e.message); }
    }

    if (status === 'rejected') {
      try {
        await sendMail({
          to: request.requester.email,
          subject: `Your request for "${request.item.title}" was declined`,
          html: `<p>Hi ${request.requester.name},</p>
                 <p>Unfortunately, ${request.owner.name} could not approve your request for <b>${request.item.title}</b> at this time.</p>`
        });
      } catch (e) { console.error('Email failed:', e.message); }
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── RENTER: REQUEST RETURN ───────────────────────────────────────────────────
// Renter clicks "I want to return this" → notifies owner
router.put('/:id/request-return', protect, async (req, res) => {
  try {
    const request = await BorrowRequest.findById(req.params.id)
      .populate('requester', 'name email')
      .populate('owner', 'name email')
      .populate('item', 'title');

    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.requester._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the borrower can initiate return' });
    if (request.status !== 'approved')
      return res.status(400).json({ message: 'Item must be in approved/borrowed state to return' });

    request.status = 'return_requested';
    request.returnRequestedAt = new Date();
    await request.save();

    // Notify owner by email
    try {
      await sendMail({
        to: request.owner.email,
        subject: `${request.requester.name} wants to return "${request.item.title}"`,
        html: `<p>Hi ${request.owner.name},</p>
               <p><b>${request.requester.name}</b> has initiated the return of your item <b>${request.item.title}</b>.</p>
               <p>Please inspect the product and confirm the return on your dashboard.</p>
               <p>After confirming, you'll be able to rate how well the borrower used your item.</p>`
      });
    } catch (e) { console.error('Email failed:', e.message); }

    res.json({ message: 'Return requested. Owner has been notified.', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── OWNER: CONFIRM RETURN ────────────────────────────────────────────────────
// Owner inspects product and confirms return
router.put('/:id/confirm-return', protect, async (req, res) => {
  try {
    const request = await BorrowRequest.findById(req.params.id)
      .populate('requester', 'name email')
      .populate('owner', 'name email')
      .populate('item', 'title');

    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.owner._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the owner can confirm return' });
    if (request.status !== 'return_requested')
      return res.status(400).json({ message: 'No return has been requested yet' });

    request.status = 'return_confirmed';
    request.returnConfirmedAt = new Date();
    await request.save();

    // Mark item as available again
    await Item.findByIdAndUpdate(request.item._id, { status: 'available' });
    await User.findByIdAndUpdate(request.requester._id, { $inc: { itemsBorrowed: 1 } });

    // Notify renter
    try {
      await sendMail({
        to: request.requester.email,
        subject: `Return confirmed for "${request.item.title}" ✅`,
        html: `<p>Hi ${request.requester.name},</p>
               <p><b>${request.owner.name}</b> has confirmed the return of <b>${request.item.title}</b>.</p>
               <p>Please take a moment to <b>rate the product</b> on your dashboard. Your feedback helps the community!</p>`
      });
    } catch (e) { console.error('Email failed:', e.message); }

    res.json({ message: 'Return confirmed. Both parties can now leave ratings.', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── RATE (after return_confirmed) ───────────────────────────────────────────
// Owner rates borrower's usage | Borrower rates the product
router.put('/:id/rate', protect, async (req, res) => {
  try {
    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });

    const request = await BorrowRequest.findById(req.params.id)
      .populate('requester', 'name')
      .populate('owner', 'name')
      .populate('item', 'title');

    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'return_confirmed' && request.status !== 'completed')
      return res.status(400).json({ message: 'Return must be confirmed before rating' });

    const isOwner = request.owner._id.toString() === req.user._id.toString();
    const isRequester = request.requester._id.toString() === req.user._id.toString();

    if (!isOwner && !isRequester) return res.status(403).json({ message: 'Not authorized' });

    if (isOwner) {
      // Owner rates borrower's usage of the product
      if (request.borrowerRating) return res.status(400).json({ message: 'You already rated this borrower' });
      request.borrowerRating = rating;
      request.borrowerReview = review;
      request.borrowerRatedAt = new Date();

      // Update borrower's user rating
      const borrower = await User.findById(request.requester._id);
      borrower.rating = ((borrower.rating * borrower.ratingCount) + rating) / (borrower.ratingCount + 1);
      borrower.ratingCount += 1;
      await borrower.save();

    } else if (isRequester) {
      // Borrower rates the product itself
      if (request.itemRating) return res.status(400).json({ message: 'You already rated this item' });
      request.itemRating = rating;
      request.itemReview = review;
      request.itemRatedAt = new Date();

      // Update item's rating
      const item = await Item.findById(request.item._id);
      item.itemRating = ((item.itemRating * item.itemRatingCount) + rating) / (item.itemRatingCount + 1);
      item.itemRatingCount += 1;
      await item.save();
    }

    // If both have rated → mark as completed
    if (request.borrowerRating && request.itemRating) {
      request.status = 'completed';
    }

    await request.save();
    res.json({ message: 'Rating submitted successfully!', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
