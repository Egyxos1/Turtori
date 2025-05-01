// src/routes/session.routes.js
const express = require('express');
const {
  createSession,
  getSessions,
  getSession,
  updateSession,
  deleteSession
} = require('../controllers/session.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router
  .route('/')
  .post(protect, authorize('teacher', 'admin'), createSession)
  .get(protect, getSessions);

router
  .route('/:id')
  .get(protect, getSession)
  .put(protect, authorize('teacher', 'admin'), updateSession)
  .delete(protect, authorize('teacher', 'admin'), deleteSession);

module.exports = router;

// src/routes/attendance.routes.js
const express = require('express');
const {
  recordAttendance,
  getSessionAttendance,
  getStudentAttendance
} = require('../controllers/attendance.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');


router.post('/', protect, authorize('teacher', 'admin'), recordAttendance);

router.get('/session/:sessionId', protect, getSessionAttendance);

router.get('/student/:studentId', protect, getStudentAttendance);

module.exports = router;