const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// Get conversations list
router.get('/conversations', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    }).populate('sender', 'name avatar').populate('receiver', 'name avatar').populate('item', 'title images');

    const conversations = {};
    messages.forEach(msg => {
      const otherId = msg.sender._id.toString() === req.user._id.toString()
        ? msg.receiver._id.toString() : msg.sender._id.toString();
      if (!conversations[otherId] || new Date(msg.createdAt) > new Date(conversations[otherId].lastMessage.createdAt)) {
        conversations[otherId] = {
          conversationId: msg.conversationId,
          otherUser: msg.sender._id.toString() === req.user._id.toString() ? msg.receiver : msg.sender,
          lastMessage: msg,
          item: msg.item,
          unread: 0
        };
      }
      if (msg.receiver._id.toString() === req.user._id.toString() && !msg.read) {
        conversations[otherId].unread = (conversations[otherId].unread || 0) + 1;
      }
    });

    res.json(Object.values(conversations));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get messages in a conversation
router.get('/:conversationId', protect, async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.conversationId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { conversationId: req.params.conversationId, receiver: req.user._id, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send a message
router.post('/', protect, async (req, res) => {
  try {
    const { receiverId, message, itemId } = req.body;
    const ids = [req.user._id.toString(), receiverId].sort();
    const conversationId = `${ids[0]}_${ids[1]}`;

    const msg = await Message.create({
      conversationId, sender: req.user._id,
      receiver: receiverId, message, item: itemId || null
    });

    const populated = await msg.populate([
      { path: 'sender', select: 'name avatar' },
      { path: 'receiver', select: 'name avatar' }
    ]);

    const io = req.app.get('io');
    io.to(receiverId).emit('receiveMessage', populated);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
