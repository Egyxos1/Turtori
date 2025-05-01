// src/controllers/user.controller.js
const User = require('../models/User');

// @desc    الحصول على جميع المستخدمين
// @route   GET /api/users
// @access  Private (Admin)
exports.getUsers = async (req, res) => {
  try {
    let query = {};

    // فلترة بناءً على الدور
    if (req.query.role) {
      query.role = req.query.role;
    }

    // فلترة بناءً على الحالة
    if (req.query.isActive) {
      query.isActive = req.query.isActive === 'true';
    }

    const users = await User.find(query).select('-password');

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على المستخدمين',
      error: error.message
    });
  }
};

// @desc    الحصول على مستخدم واحد
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على المستخدم'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على المستخدم',
      error: error.message
    });
  }
};

// @desc    تحديث مستخدم
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = async (req, res) => {
  try {
    // التحقق من أن المستخدم يقوم بتحديث ملفه الشخصي أو هو مشرف
    if (
      req.user.role !== 'admin' &&
      req.user._id.toString() !== req.params.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتحديث هذا المستخدم'
      });
    }

    // منع تغيير الدور إلا للمشرف
    if (req.body.role && req.user.role !== 'admin') {
      delete req.body.role;
    }

    // منع تغيير كلمة المرور هنا
    if (req.body.password) {
      delete req.body.password;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على المستخدم'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث المستخدم',
      error: error.message
    });
  }
};

// @desc    تغيير كلمة المرور
// @route   PUT /api/users/:id/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // التحقق من أن المستخدم يقوم بتغيير كلمة المرور الخاصة به
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتغيير كلمة مرور لمستخدم آخر'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على المستخدم'
      });
    }

    // التحقق من كلمة المرور الحالية
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    // تحديث كلمة المرور
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تغيير كلمة المرور',
      error: error.message
    });
  }
};

// @desc    حذف مستخدم
// @route   DELETE /api/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على المستخدم'
      });
    }

    // بدلاً من الحذف الفعلي، يمكن تعطيل المستخدم
    user.isActive = false;
    await user.save();

    // يمكن أيضًا الحذف الفعلي
    // await user.remove();

    res.json({
      success: true,
      message: 'تم تعطيل/حذف المستخدم بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف المستخدم',
      error: error.message
    });
  }
};

// src/controllers/notification.controller.js
const Notification = require('../models/Notification');

// @desc    الحصول على جميع الإشعارات للمستخدم الحالي
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('relatedTo');

    res.json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على الإشعارات',
      error: error.message
    });
  }
};

// @desc    تحديث حالة قراءة الإشعار
// @route   PUT /api/notifications/:id
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على الإشعار'
      });
    }

    notification.isRead = true;
    await notification.save();

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة الإشعار',
      error: error.message
    });
  }
};

// @desc    تحديث حالة قراءة جميع الإشعارات
// @route   PUT /api/notifications/mark-all-read
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({
      success: true,
      message: 'تم تحديث جميع الإشعارات كمقروءة'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة الإشعارات',
      error: error.message
    });
  }