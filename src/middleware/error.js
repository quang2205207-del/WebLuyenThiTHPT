const config = require('../config/env');
const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError(`Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`, 404));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500;
  let message = 'Lỗi máy chủ';
  let errors;
  let code;

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
    errors = err.errors;
    code = err.code;
  } else if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = 'Dữ liệu không hợp lệ';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Giá trị không hợp lệ cho trường "${err.path}"`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0];
    message = field ? `Giá trị của "${field}" đã tồn tại` : 'Dữ liệu bị trùng lặp';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'JSON gửi lên không hợp lệ';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Dữ liệu gửi lên quá lớn';
  } else {
    console.error('[error]', err);
    if (config.env !== 'production') message = err.message || message;
  }

  const body = { success: false, message };
  if (errors) body.errors = errors;
  if (code) body.code = code;
  if (status === 500 && config.env === 'development') body.stack = err.stack;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
