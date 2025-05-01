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
}