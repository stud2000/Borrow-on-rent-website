const express = require('express');
const router = express.Router();
const BorrowRequest = require('../models/BorrowRequest');
const Item = require('../models/Item');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const sendMail = require('../utils/mailer');

// Helper: parse date safely from any format
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  // Handle DD-MM-YYYY format from frontend
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('-');
    return new Date(`${year}-${month}-${day}`);
  }
  return new Date(dateStr);
};

// ─── CREATE BORROW REQUEST ────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { itemId, message, startDate, endDate } = req.body;

    console.log('📋 New borrow request:', { itemId, startDate, endDate, message });

    if (!itemId || !startDate || !endDate)
      return res.status(400).json({ message: 'itemId, startDate and endDate are required' });

    const parsedStart = parseDate(startDate);
    const parsedEnd = parseDate(endDate);

    if (isNaN(parsedStart) || isNaN(parsedEnd))
      return res.status(400).json({ message: 'Invalid date format' });

    if (parsedEnd <= parsedStart)
      return res.status(400).json({ message: 'End date must be after start date' });

    const item = await Item.findById(itemId).populate('owner');
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.status !== 'available') return res.status(400).json({ message: 'Item not available' });
    if (item.owner._id.toString() === req.user._id.toString())
      return res.status(400).json({ message: 'Cannot borrow your own item' });

    const existing = await BorrowRequest.findOne({
      item: itemId, requester: req.user._id, status: 'pending'
    });
    if (existing) return res.status(400).json({ message: 'You already have a pending request for this item' });

    const request = await BorrowRequest.create({
      item: itemId,
      requester: req.user._id,
      owner: item.owner._id,
      message: message || '',
      startDate: parsedStart,
      endDate: parsedEnd
    });

    // Notify owner by email (non-blocking)
    sendMail({
      to: item.owner.email,
      subject: `New borrow request for "${item.title}"`,
      html: `<p>Hi ${item.owner.name},</p>
             <p><b>${req.user.name}</b> wants to borrow your item <b>${item.title}</b>.</p>
             <p>Message: ${message || 'No message'}</p>
             <p>Dates: ${parsedStart.toDateString()} → ${parsedEnd.toDateString()}</p>
             <p>Login to approve or reject the request.</p>`
    }).catch(e => console.error('Email failed (non-blocking):', e.message));

    const populated = await request.populate([
      { path: 'item', select: 'title images category' },
      { path: 'requester', select: 'name avatar phone' },
      { path: 'owner', select: 'name avatar phone' }
    ]);

    res.status(201).json(populated);
  } catch (err) {
    console.error('❌ Create request error:', err.message);
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

      sendMail({
        to: request.requester.email,
        subject: `Your request for "${request.item.title}" was approved! ✅`,
        html: `<p>Hi ${request.requester.name},</p>
               <p>Great news! <b>${request.owner.name}</b> approved your request to borrow <b>${request.item.title}</b>.</p>
               <p>When done, go to your dashboard and click <b>"Request Return"</b>.</p>`
      }).catch(e => console.error('Email failed (non-blocking):', e.message));
    }

    if (status === 'rejected') {
      sendMail({
        to: request.requester.email,
        subject: `Your request for "${request.item.title}" was declined`,
        html: `<p>Hi ${request.requester.name},</p>
               <p>Unfortunately, ${request.owner.name} could not approve your request for <b>${request.item.title}</b>.</p>`
      }).catch(e => console.error('Email failed (non-blocking):', e.message));
    }

    res.json(request);
  } catch (err) {
    console.error('❌ Status update error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── RENTER: REQUEST RETURN ───────────────────────────────────────────────────
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
      return res.status(400).json({ message: 'Item must be approved/borrowed to return' });

    request.status = 'return_requested';
    request.returnRequestedAt = new Date();
    await request.save();

    sendMail({
      to: request.owner.email,
      subject: `${request.requester.name} wants to return "${request.item.title}"`,
      html: `<p>Hi ${request.owner.name},</p>
             <p><b>${request.requester.name}</b> has initiated the return of <b>${request.item.title}</b>.</p>
             <p>Please inspect the product and confirm the return on your dashboard.</p>`
    }).catch(e => console.error('Email failed (non-blocking):', e.message));

    res.json({ message: 'Return requested. Owner has been notified.', request });
  } catch (err) {
    console.error('❌ Request return error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── OWNER: CONFIRM RETURN ────────────────────────────────────────────────────
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

    await Item.findByIdAndUpdate(request.item._id, { status: 'available' });
    await User.findByIdAndUpdate(request.requester._id, { $inc: { itemsBorrowed: 1 } });

    sendMail({
      to: request.requester.email,
      subject: `Return confirmed for "${request.item.title}" ✅`,
      html: `<p>Hi ${request.requester.name},</p>
             <p><b>${request.owner.name}</b> confirmed the return of <b>${request.item.title}</b>.</p>
             <p>Please <b>rate the product</b> on your dashboard!</p>`
    }).catch(e => console.error('Email failed (non-blocking):', e.message));

    res.json({ message: 'Return confirmed. Both parties can now leave ratings.', request });
  } catch (err) {
    console.error('❌ Confirm return error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── RATE ─────────────────────────────────────────────────────────────────────
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
    if (!['return_confirmed', 'completed'].includes(request.status))
      return res.status(400).json({ message: 'Return must be confirmed before rating' });

    const isOwner = request.owner._id.toString() === req.user._id.toString();
    const isRequester = request.requester._id.toString() === req.user._id.toString();

    if (!isOwner && !isRequester) return res.status(403).json({ message: 'Not authorized' });

    if (isOwner) {
      if (request.borrowerRating) return res.status(400).json({ message: 'Already rated this borrower' });
      request.borrowerRating = rating;
      request.borrowerReview = review;
      request.borrowerRatedAt = new Date();

      const borrower = await User.findById(request.requester._id);
      borrower.rating = ((borrower.rating * borrower.ratingCount) + rating) / (borrower.ratingCount + 1);
      borrower.ratingCount += 1;
      await borrower.save();

    } else {
      if (request.itemRating) return res.status(400).json({ message: 'Already rated this item' });
      request.itemRating = rating;
      request.itemReview = review;
      request.itemRatedAt = new Date();

      const item = await Item.findById(request.item._id);
      item.itemRating = ((item.itemRating * item.itemRatingCount) + rating) / (item.itemRatingCount + 1);
      item.itemRatingCount += 1;
      await item.save();
    }

    if (request.borrowerRating && request.itemRating) {
      request.status = 'completed';
    }

    await request.save();
    res.json({ message: 'Rating submitted!', request });
  } catch (err) {
    console.error('❌ Rate error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
