const mongoose = require('mongoose');

const borrowRequestSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  status: {
    type: String,
    enum: [
      'pending',       // requester sent request
      'approved',      // owner approved
      'rejected',      // owner rejected
      'cancelled',     // requester cancelled
      'return_requested',  // ← NEW: renter asked to return
      'return_confirmed',  // ← NEW: owner confirmed return
      'completed'          // ← NEW: both rated, fully done
    ],
    default: 'pending'
  },

  message: { type: String, default: '' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  // Return flow
  returnRequestedAt: { type: Date },           // when renter initiated return
  returnConfirmedAt: { type: Date },           // when owner confirmed return

  // Owner rates borrower's usage of product (1-5)
  borrowerRating: { type: Number, min: 1, max: 5 },
  borrowerReview: { type: String },
  borrowerRatedAt: { type: Date },

  // Borrower rates the product itself (1-5)
  itemRating: { type: Number, min: 1, max: 5 },
  itemReview: { type: String },
  itemRatedAt: { type: Date },

  // (optional) borrower also rates owner
  ownerRating: { type: Number, min: 1, max: 5 },
  ownerReview: { type: String },

}, { timestamps: true });

module.exports = mongoose.model('BorrowRequest', borrowRequestSchema);
