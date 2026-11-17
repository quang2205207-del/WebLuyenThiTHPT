const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const config = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

// Render/Vercel đứng sau proxy: cần để rate-limit lấy đúng IP người dùng
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    // Cho phép các origin trong CLIENT_URL và công cụ không có origin (Postman, curl)
    origin(origin, callback) {
      callback(null, !origin || config.clientUrls.includes(origin));
    },
  }),
);
if (config.env !== 'test') app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.json({ success: true, name: 'exam-api', docs: 'Xem README.md', health: '/api/health' });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    time: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/blocks', require('./routes/blocks'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/stats', require('./routes/stats'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
