// src/utils/generateToken.js
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

module.exports = generateToken;

// src/controllers/auth.controller.js
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    تسجيل مستخدم جديد
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, subjects } = req.body;

    // التحقق من وجود المستخدم
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مسجل بالفعل'
      });
    }

    // إنشاء مستخدم جديد
    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      subjects: subjects || []
    });

    if (user) {
      res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          subjects: user.subjects,
          token: generateToken(user._id)
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'بيانات المستخدم غير صالحة'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل المستخدم',
      error: error.message
    });
  }
};

// @desc    تسجيل دخول المستخدم
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // البحث عن المستخدم
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    // التحقق من كلمة المرور
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        subjects: user.subjects,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الدخول',
      error: error.message
    });
  }
};

// @desc    الحصول على بيانات المستخدم الحالي
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على بيانات المستخدم',
      error: error.message
    });
  }
};

// src/routes/auth.routes.js
const express = require('express');
const { register, login, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;