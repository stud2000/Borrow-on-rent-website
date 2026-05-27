const mongoose = require('mongoose');

const borrowRequestSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'returned', 'cancelled'],
    default: 'pending'
  },
  message: { type: String, default: '' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  ownerRating: { type: Number, min: 1, max: 5 },
  borrowerRating: { type: Number, min: 1, max: 5 },
  ownerReview: { type: String },
  borrowerReview: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('BorrowRequest', borrowRequestSchema);
