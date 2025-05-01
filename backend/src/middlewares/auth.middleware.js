// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;

  // التحقق من وجود التوكن في الهيدر
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // التحقق من وجود التوكن
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'غير مصرح لك بالوصول، يرجى تسجيل الدخول'
    });
  }

  try {
    // التحقق من صلاحية التوكن
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // البحث عن المستخدم وتخزينه في الطلب
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'لم يتم العثور على المستخدم'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'غير مصرح لك بالوصول، التوكن غير صالح'
    });
  }
};

// التحقق من الأدوار المسموح لها
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `دور ${req.user.role} غير مصرح له بالوصول إلى هذا المورد`
      });
    }
    next();
  };
};