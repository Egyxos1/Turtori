// src/controllers/attendance.controller.js
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Notification = require('../models/Notification');

// @desc    تسجيل حضور
// @route   POST /api/attendance
// @access  Private (Teacher, Admin)
exports.recordAttendance = async (req, res) => {
  try {
    const { sessionId, studentId, status, notes } = req.body;

    // التحقق من وجود الجلسة
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على الجلسة'
      });
    }

    // التحقق من أن المدرس هو مالك الجلسة أو المستخدم مشرف
    if (
      req.user.role !== 'admin' &&
      session.teacher.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتسجيل الحضور لهذه الجلسة'
      });
    }

    // التحقق من أن الطالب مسجل في الجلسة
    if (!session.students.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'الطالب غير مسجل في هذه الجلسة'
      });
    }

    // إنشاء أو تحديث سجل الحضور
    let attendance = await Attendance.findOne({
      session: sessionId,
      student: studentId
    });

    if (attendance) {
      attendance.status = status;
      attendance.notes = notes;
      
      if (status === 'present' && !attendance.joinTime) {
        attendance.joinTime = new Date();
      }

      await attendance.save();
    } else {
      attendance = await Attendance.create({
        session: sessionId,
        student: studentId,
        status,
        notes,
        joinTime: status === 'present' ? new Date() : null
      });
    }

    // إنشاء إشعار للطالب
    await Notification.create({
      user: studentId,
      title: 'تحديث الحضور',
      message: `تم تسجيل حضورك بحالة "${status}" للجلسة "${session.title}"`,
      type: 'session',
      relatedTo: session._id,
      onModel: 'Session'
    });

    res.status(201).json({
      success: true,
      attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الحضور',
      error: error.message
    });
  }
};

// @desc    الحصول على سجلات الحضور لجلسة
// @route   GET /api/attendance/session/:sessionId
// @access  Private (Teacher, Admin)
exports.getSessionAttendance = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على الجلسة'
      });
    }

    // التحقق من أن المستخدم له علاقة بالجلسة
    if (
      req.user.role !== 'admin' &&
      session.teacher.toString() !== req.user._id.toString() &&
      !session.students.includes(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول إلى سجلات الحضور لهذه الجلسة'
      });
    }

    const attendance = await Attendance.find({ session: req.params.sessionId })
      .populate('student', 'name email');

    res.json({
      success: true,
      count: attendance.length,
      attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على سجلات الحضور',
      error: error.message
    });
  }
};

// @desc    الحصول على سجلات الحضور لطالب
// @route   GET /api/attendance/student/:studentId
// @access  Private
exports.getStudentAttendance = async (req, res) => {
  try {
    // التحقق من الصلاحيات
    if (
      req.user.role === 'student' &&
      req.user._id.toString() !== req.params.studentId
    ) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول إلى سجلات الحضور لطالب آخر'
      });
    }

    const attendance = await Attendance.find({ student: req.params.studentId })
      .populate({
        path: 'session',
        select: 'title startTime endTime subject teacher',
        populate: {
          path: 'teacher',
          select: 'name email'
        }
      });

    res.json({
      success: true,
      count: attendance.length,
      attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على سجلات الحضور',
      error: error.message
    });
  }
};