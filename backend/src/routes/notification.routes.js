// src/routes/notification.routes.js
const express = require('express');
const {
  getNotifications,
  markAsRead,
  markAllAsRead
} = require('../controllers/notification.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', protect, getNotifications);
router.put('/:id', protect, markAsRead);
router.put('/mark-all-read', protect, markAllAsRead);

module.exports = router;