// src/routes/user.routes.js
const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  changePassword,
  deleteUser
} = require('../controllers/user.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router
  .route('/')
  .get(protect, authorize('admin'), getUsers);

router
  .route('/:id')
  .get(protect, getUser)
  .put(protect, updateUser)
  .delete(protect, authorize('admin'), deleteUser);

router
  .route('/:id/change-password')
  .put(protect, changePassword);

module.exports = router;