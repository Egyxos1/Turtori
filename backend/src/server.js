// src/server.js
const app = require('./app');
const connectDB = require('./config/db');

// الاتصال بقاعدة البيانات
connectDB();

// تشغيل السيرفر
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});