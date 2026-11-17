const mongoose = require('mongoose');
const config = require('./config/env');
const app = require('./app');

async function start() {
  if (!config.jwtSecret || config.jwtSecret.length < 16) {
    console.error('❌ Thiếu JWT_SECRET hoặc quá ngắn (tối thiểu 16 ký tự). Hãy đặt trong file .env');
    process.exit(1);
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ Đã kết nối MongoDB');

  // Tạo index (kể cả index unique một phần của Submission) trước khi nhận request
  await mongoose.connection.syncIndexes();

  const server = app.listen(config.port, () => {
    console.log(`🚀 API chạy tại http://localhost:${config.port} (${config.env})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} nhận được, đang tắt máy chủ...`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('❌ Không thể khởi động máy chủ:', err.message);
  process.exit(1);
});
