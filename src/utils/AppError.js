class AppError extends Error {
  /**
   * @param {string} message  Thông điệp hiển thị cho client
   * @param {number} statusCode  HTTP status
   * @param {{errors?: any, code?: string}} extra  errors: chi tiết lỗi theo trường; code: mã lỗi máy đọc được (vd TIME_UP)
   */
  constructor(message, statusCode = 400, { errors, code } = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.code = code;
    this.isOperational = true;
  }
}

module.exports = AppError;
