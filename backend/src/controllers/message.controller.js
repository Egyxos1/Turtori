// src/controllers/message.controller.js
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    إرسال رسالة جديدة
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { receiver, content } = req.body;

    // التحقق من وجود المستلم
    const receiverUser = await User.findById(receiver);

    if (!receiverUser) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على المستلم'
      });
    }

    // إنشاء الرسالة
    const message = await Message.create({
      sender: req.user._id,
      receiver,
      content
    });

    // إنشاء إشعار للمستلم
    await Notification.create({
      user: receiver,
      title: 'رسالة جديدة',
      message: `لديك رسالة جديدة من ${req.user.name}`,
      type: 'message',
      relatedTo: message._id,
      onModel: 'Message'
    });

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال الرسالة',
      error: error.message
    });
  }
};

// @desc    الحصول على الرسائل بين المستخدم الحالي ومستخدم آخر
// @route   GET /api/messages/:userId
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const userId = req.params.userId;

    // التحقق من وجود المستخدم الآخر
    const otherUser = await User.findById(userId);

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على المستخدم'
      });
    }

    // البحث عن الرسائل بين المستخدمين
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ]
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name')
      .populate('receiver', 'name');

    res.json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على الرسائل',
      error: error.message
    });
  }
};

// @desc    الحصول على جميع المحادثات للمستخدم الحالي
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    // البحث عن الرسائل التي أرسلها المستخدم
    const sentMessages = await Message.find({ sender: req.user._id })
      .sort({ createdAt: -1 })
      .populate('receiver', 'name email');

    // البحث عن الرسائل التي استلمها المستخدم
    const receivedMessages = await Message.find({ receiver: req.user._id })
      .sort({ createdAt: -1 })
      .populate('sender', 'name email');

    // دمج المستخدمين الفريدين لإنشاء قائمة بالمحادثات
    const conversations = new Map();

    sentMessages.forEach(message => {
      const receiverId = message.receiver._id.toString();
      if (!conversations.has(receiverId)) {
        conversations.set(receiverId, {
          user: message.receiver,
          lastMessage: message.content,
          updatedAt: message.createdAt,
          unreadCount: 0
        });
      }
    });

    receivedMessages.forEach(message => {
      const senderId = message.sender._id.toString();
      if (!conversations.has(senderId)) {
        conversations.set(senderId, {
          user: message.sender,
          lastMessage: message.content,
          updatedAt: message.createdAt,
          unreadCount: message.isRead ? 0 : 1
        });
      } else {
        // تحديث عدد الرسائل غير المقروءة
        if (!message.isRead) {
          const conversation = conversations.get(senderId);
          conversation.unreadCount += 1;
          conversations.set(senderId, conversation);
        }
      }
    });

    // تحويل المحادثات إلى مصفوفة وترتيبها حسب آخر تحديث
    const conversationsArray = Array.from(conversations.values())
      .sort((a, b) => b.updatedAt - a.updatedAt);

    res.json({
      success: true,
      count: conversationsArray.length,
      conversations: conversationsArray
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على المحادثات',
      error: error.message
    });
  }
};

// @desc    تحديث حالة قراءة الرسالة
// @route   PUT /api/messages/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على الرسالة'
      });
    }

    // التحقق من أن المستخدم هو مستلم الرسالة
    if (message.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتحديث حالة هذه الرسالة'
      });
    }

    // تحديث حالة الرسالة
    message.isRead = true;
    await message.save();

    res.json({
      success: true,
      message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة الرسالة',
      error: error.message
    });
  }
};