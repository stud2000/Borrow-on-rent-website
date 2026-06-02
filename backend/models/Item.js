const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: ['Tools', 'Books', 'Electronics', 'Sports', 'Lab Equipment', 'Kitchen', 'Garden', 'Clothing', 'Other']
  },
  images: [{ type: String }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['available', 'borrowed', 'unavailable'], default: 'available' },
  condition: { type: String, enum: ['New', 'Like New', 'Good', 'Fair'], default: 'Good' },
  borrowDuration: { type: String, default: 'Flexible' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  neighborhood: { type: String, default: '' },
  tags: [{ type: String }],
  views: { type: Number, default: 0 },
  totalBorrows: { type: Number, default: 0 },
itemRating: { type: Number, default: 0 },
itemRatingCount: { type: Number, default: 0 }
}, { timestamps: true });

itemSchema.index({ location: '2dsphere' });
itemSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Item', itemSchema);
