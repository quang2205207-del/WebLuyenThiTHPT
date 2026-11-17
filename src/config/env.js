require('dotenv').config();

const toInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/exam_platform',

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: toInt(process.env.BCRYPT_ROUNDS, 12),

  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean),

  submitGraceSeconds: toInt(process.env.SUBMIT_GRACE_SECONDS, 15),

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: toInt(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Luyện thi Online <no-reply@example.com>',
  },

  seedAdmin: {
    name: process.env.ADMIN_NAME || 'Quản trị viên',
    email: (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'Admin12345',
  },
};

module.exports = config;
