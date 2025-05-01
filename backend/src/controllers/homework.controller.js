// src/controllers/homework.controller.js
const Homework = require('../models/Homework');
const HomeworkSubmission = require('../models/HomeworkSubmission');
const Session = require('../models/Session');
const Notification = require('../models/Notification');

// @desc    إنشاء واجب منزلي جديد
// @route   POST /api/homework
// @access  Private (Teacher, Admin)
exports.createHomework = async (req, res) => {
  try {
    const { title, description, sessionId, dueDate, attachments } = req.body;

    // التحقق من وجود الجلسة
    if (sessionId) {
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
          message: 'غير مصرح لك بإنشاء واجب منزلي لهذه الجلسة'
        });
      }
    }

    // إنشاء الواجب المنزلي
    const homework = await Homework.create({
      title,
      description,
      session: sessionId,
      teacher: req.user._id,
      dueDate,
      attachments: attachments || []
    });

    // إرسال إشعارات للطلاب
    if (sessionId) {
      const session = await Session.findById(sessionId);
      
      const notifications = session.students.map(studentId => ({
        user: studentId,
        title: 'واجب منزلي جديد',
        message: `تم إضافة واجب منزلي جديد "${title}" للجلسة "${session.title}"`,
        type: 'homework',
        relatedTo: homework._id,
        onModel: 'Homework'
      }));

      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      success: true,
      homework
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الواجب المنزلي',
      error: error.message
    });
  }
};

// @desc    الحصول على جميع الواجبات المنزلية
// @route   GET /api/homework
// @access  Private
exports.getHomeworks = async (req, res) => {
  try {
    let query = {};

    // فلترة بناءً على دور المستخدم
    if (req.user.role === 'teacher') {
      query.teacher = req.user._id;
    } else if (req.user.role === 'student') {
      // الحصول على الجلسات التي يشترك فيها الطالب
      const sessions = await Session.find({ students: req.user._id }).select('_id');
      query.session = { $in: sessions.map(session => session._id) };
    }

    // فلترة إضافية
    if (req.query.session) {
      query.session = req.query.session;
    }

    if (req.query.upcoming === 'true') {
      query.dueDate = { $gte: new Date() };
    }

    const homeworks = await Homework.find(query)
      .populate('teacher', 'name email')
      .populate('session', 'title startTime endTime');

    res.json({
      success: true,
      count: homeworks.length,
      homeworks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على الواجبات المنزلية',
      error: error.message
    });
  }
};

// @desc    الحصول على واجب منزلي واحد
// @route   GET /api/homework/:id
// @access  Private
exports.getHomework = async (req, res) => {
  try {
    const homework = await Homework.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('session', 'title startTime endTime students');

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على الواجب المنزلي'
      });
    }

    // التحقق من الصلاحيات
    if (req.user.role === 'student') {
      // التحقق من أن الطالب مسجل في الجلسة
      if (
        homework.session &&
        !homework.session.students.some(student => student.toString() === req.user._id.toString())
      ) {
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بالوصول إلى هذا الواجب المنزلي'
        });
      }
    } else if (
      req.user.role === 'teacher' &&
      homework.teacher.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول إلى هذا الواجب المنزلي'
      });
    }

    res.json({
      success: true,
      homework
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على الواجب المنزلي',
      error: error.message
    });
  }
};

// @desc    تسليم واجب منزلي
// @route   POST /api/homework/:id/submit
// @access  Private (Student)
exports.submitHomework = async (req, res) => {
  try {
    const { content, attachments } = req.body;

    // التحقق من وجود الواجب المنزلي
    const homework = await Homework.findById(req.params.id).populate('session');

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على الواجب المنزلي'
      });
    }

    // التحقق من أن المستخدم طالب
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'يمكن للطلاب فقط تسليم الواجبات المنزلية'
      });
    }

    // التحقق من أن الطالب مسجل في الجلسة
    if (
      homework.session &&
      !homework.session.students.includes(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتسليم هذا الواجب المنزلي'
      });
    }

    // التحقق من أن الواجب المنزلي لم ينته موعده
    if (new Date(homework.dueDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'انتهى موعد تسليم الواجب المنزلي'
      });
    }

    // البحث عن تسليم سابق
    let submission = await HomeworkSubmission.findOne({
      homework: req.params.id,
      student: req.user._id
    });

    if (submission) {
      // تحديث التسليم السابق
      submission.content = content;
      submission.attachments = attachments || [];
      submission.submittedAt = Date.now();
      
      await submission.save();
    } else {
      // إنشاء تسليم جديد
      submission = await HomeworkSubmission.create({
        homework: req.params.id,
        student: req.user._id,
        content,
        attachments: attachments || []
      });
    }

    // إنشاء إشعار للمدرس
    await Notification.create({
      user: homework.teacher,
      title: 'تسليم واجب منزلي',
      message: `قام الطالب ${req.user.name} بتسليم الواجب المنزلي "${homework.title}"`,
      type: 'homework',
      relatedTo: homework._id,
      onModel: 'Homework'
    });

    res.status(201).json({
      success: true,
      submission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تسليم الواجب المنزلي',
      error: error.message
    });
  }
};

// @desc    تقييم تسليم واجب منزلي
// @route   PUT /api/homework/submission/:id
// @access  Private (Teacher, Admin)
exports.gradeSubmission = async (req, res) => {
  try {
    const { grade, feedback } = req.body;

    // التحقق من وجود التسليم
    let submission = await HomeworkSubmission.findById(req.params.id)
      .populate({
        path: 'homework',
        select: 'teacher title'
      });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على التسليم'
      });
    }

    // التحقق من أن المدرس هو مالك الواجب المنزلي أو المستخدم مشرف
    if (
      req.user.role !== 'admin' &&
      submission.homework.teacher.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتقييم هذا التسليم'
      });
    }

    // تحديث التسليم
    submission.grade = grade;
    submission.feedback = feedback;
    
    await submission.save();

    // إنشاء إشعار للطالب
    await Notification.create({
      user: submission.student,
      title: 'تقييم واجب منزلي',
      message: `تم تقييم الواجب المنزلي "${submission.homework.title}" بدرجة ${grade}/100`,
      type: 'homework',
      relatedTo: submission.homework._id,
      onModel: 'Homework'
    });

    res.json({
      success: true,
      submission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تقييم التسليم',
      error: error.message
    });
  }
};

// src/routes/homework.routes.js
const express = require('express');
const {
  createHomework,
  getHomeworks,
  getHomework,
  submitHomework,
  gradeSubmission
} = require('../controllers/homework.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router
  .route('/')
  .post(protect, authorize('teacher', 'admin'), createHomework)
  .get(protect, getHomeworks);

router
  .route('/:id')
  .get(protect, getHomework);

router
  .route('/:id/submit')
  .post(protect, authorize('student'), submitHomework);

router
  .route('/submission/:id')
  .put(protect, authorize('teacher', 'admin'), gradeSubmission);

module.exports = router;