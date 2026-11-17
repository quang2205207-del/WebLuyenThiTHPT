const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/token');

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

async function loadUser(token) {
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    throw new AppError(
      expired ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' : 'Token không hợp lệ',
      401,
      { code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID' },
    );
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new AppError('Tài khoản không còn tồn tại', 401, { code: 'TOKEN_INVALID' });
  if (!user.isActive) throw new AppError('Tài khoản đã bị khóa', 403, { code: 'ACCOUNT_DISABLED' });
  if (user.changedPasswordAfter(decoded.iat)) {
    throw new AppError('Mật khẩu đã thay đổi, vui lòng đăng nhập lại', 401, { code: 'TOKEN_INVALID' });
  }
  return user;
}

// Bắt buộc đăng nhập: gắn req.user.
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw new AppError('Bạn chưa đăng nhập', 401, { code: 'NO_TOKEN' });
  req.user = await loadUser(token);
  next();
});

// Đăng nhập không bắt buộc: có token hợp lệ thì gắn req.user, ngược lại coi như khách.
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = await loadUser(token);
    } catch (err) {
      // token sai/hết hạn: coi như khách
    }
  }
  next();
});

// Phân quyền theo vai trò: restrictTo('admin')
const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('Bạn không có quyền thực hiện thao tác này', 403, { code: 'FORBIDDEN' }));
  }
  return next();
};

const adminOnly = [protect, restrictTo('admin')];

module.exports = { protect, optionalAuth, restrictTo, adminOnly };
