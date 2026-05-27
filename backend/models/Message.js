const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
