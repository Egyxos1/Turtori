// src/routes/attendance.routes.js
const express = require('express');
const {
  recordAttendance,
  getSessionAttendance,
  getStudentAttendance
} = require('../controllers/attendance.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/', protect, authorize('teacher', 'admin'), recordAttendance);

router.get('/session/:sessionId', protect, getSessionAttendance);

router.get('/student/:studentId', protect, getStudentAttendance);

module.exports = router;