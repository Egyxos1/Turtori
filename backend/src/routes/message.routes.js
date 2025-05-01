// src/routes/message.routes.js
const express = require('express');
const { 
  sendMessage, 
  getMessages, 
  getConversations, 
  markAsRead 
} = require('../controllers/message.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/', protect, sendMessage);
router.get('/conversations', protect, getConversations);
router.get('/:userId', protect, getMessages);
router.put('/:id/read', protect, markAsRead);

module.exports = router;