// src/controllers/session.controller.js
const Session = require('../models/Session');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    إنشاء جلسة جديدة
// @route   POST /api/sessions
// @access  Private (Teacher, Admin)
exports.createSession = async (req, res) => {
  try {
    const { title, description, startTime, endTime, subject, students, meetingLink, materialLinks } = req.body;

    // التحقق من أن المستخدم مدرس أو مشرف
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بإنشاء جلسات'
      });
    }

    // إنشاء الجلسة
    const session = await Session.create({
      title,
      description,
      teacher: req.user._id,
      students: students || [],
      startTime,
      endTime,
      subject,
      meetingLink,
      materialLinks: materialLinks || []
    });

    // إنشاء إشعارات للطلاب
    if (students && students.length > 0) {
      const notifications = students.map(studentId => ({
        user: studentId,
        title: 'جلسة جديدة',
        message: `تم إضافتك إلى جلسة ${title} في ${new Date(startTime).toLocaleString('ar-EG')}`,
        type: 'session',
        relatedTo: session._id,
        onModel: 'Session'
      }));

      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      success: true,
      session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الجلسة',
      error: error.message
    });
  }
};

// @desc    الحصول على جميع الجلسات
// @route   GET /api/sessions
// @access  Private
exports.getSessions = async (req, res) => {
  try {
    let query = {};

    // فلترة بناءً على دور المستخدم
    if (req.user.role === 'teacher') {
      query.teacher = req.user._id;
    } else if (req.user.role === 'student') {
      query.students = { $in: [req.user._id] };
    }

    // فلترة إضافية
    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.subject) {
      query.subject = req.query.subject;
    }

    if (req.query.startDate && req.query.endDate) {
      query.startTime = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    // الجلسات المستقبلية فقط
    if (req.query.upcoming === 'true') {
      query.startTime = { $gte: new Date() };
    }

    const sessions = await Session.find(query)
      .populate('teacher', 'name email')
      .populate('students', 'name email')
      .sort({ startTime: 1 });

    res.json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على الجلسات',
      error: error.message
    });
  }
};

// @desc    الحصول على جلسة واحدة
// @route   GET /api/sessions/:id
// @access  Private
exports.getSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('students', 'name email');

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
      !session.students.some(student => student._id.toString() === req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول إلى هذه الجلسة'
      });
    }

    res.json({
      success: true,
      session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على الجلسة',
      error: error.message
    });
  }
};

// @desc    تحديث جلسة
// @route   PUT /api/sessions/:id
// @access  Private (Teacher, Admin)
exports.updateSession = async (req, res) => {
  try {
    let session = await Session.findById(req.params.id);

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
        message: 'غير مصرح لك بتحديث هذه الجلسة'
      });
    }

    // تحديث الجلسة
    session = await Session.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الجلسة',
      error: error.message
    });
  }
};

// @desc    حذف جلسة
// @route   DELETE /api/sessions/:id
// @access  Private (Teacher, Admin)
exports.deleteSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

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
        message: 'غير مصرح لك بحذف هذه الجلسة'
      });
    }

    // استخدام findByIdAndDelete بدلاً من remove() لأن الأخيرة أصبحت قديمة
    await Session.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'تم حذف الجلسة بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الجلسة',
      error: error.message
    });
  }
};

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