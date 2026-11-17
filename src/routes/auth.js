const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const config = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendOk } = require('../utils/http');
const { getBody, normalizeEmail, requireString, validatePassword } = require('../utils/validators');
const { signToken } = require('../utils/token');
const { sendResetPasswordEmail } = require('../utils/email');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Chống dò mật khẩu / spam: tối đa 30 yêu cầu mỗi 15 phút cho mỗi IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.env === 'test',
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau ít phút' },
});

const authPayload = (user) => ({ token: signToken(user), user });

// POST /api/auth/register — luôn tạo tài khoản học sinh
router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    const name = requireString(body.name, 'Họ tên', { max: 100 });
    const email = normalizeEmail(body.email);
    validatePassword(body.password);

    if (await User.exists({ email })) throw new AppError('Email đã được sử dụng', 409);

    const user = await User.create({ name, email, password: body.password, role: 'student' });
    sendOk(res, authPayload(user), { status: 201, message: 'Đăng ký thành công' });
  }),
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    const email = normalizeEmail(body.email);
    if (typeof body.password !== 'string' || !body.password) {
      throw new AppError('Vui lòng nhập mật khẩu', 400);
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(body.password))) {
      throw new AppError('Email hoặc mật khẩu không đúng', 401);
    }
    if (!user.isActive) throw new AppError('Tài khoản đã bị khóa', 403, { code: 'ACCOUNT_DISABLED' });

    sendOk(res, authPayload(user), { message: 'Đăng nhập thành công' });
  }),
);

// GET /api/auth/me — AuthContext gọi khi tải lại trang để lấy user từ token
router.get('/me', protect, (req, res) => sendOk(res, { user: req.user }));

// POST /api/auth/forgot-password — luôn trả cùng một thông điệp để không lộ email nào đã đăng ký
router.post(
  '/forgot-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    const email = normalizeEmail(body.email);
    const message = 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi';

    const user = await User.findOne({ email, isActive: true });
    if (!user) return sendOk(res, undefined, { message });

    const rawToken = user.createResetToken();
    await user.save({ validateBeforeSave: false });

    const link = `${config.clientUrls[0]}/reset-password/${rawToken}`;
    let result = null; // null = lỗi khi gửi mail
    try {
      result = await sendResetPasswordEmail(user.email, link);
    } catch (err) {
      console.error('[email] Gửi mail đặt lại mật khẩu thất bại:', err.message);
    }

    // Ở môi trường phát triển, trả token trong response để test không cần SMTP.
    const devMode = config.env !== 'production';
    const keepToken = Boolean(result && (result.delivered || devMode));
    if (!keepToken) {
      // Không ai nhận được link nên huỷ token vừa tạo
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
    }

    const data = devMode && keepToken ? { resetToken: rawToken } : undefined;
    return sendOk(res, data, { message });
  }),
);

// POST /api/auth/reset-password/:token
router.post(
  '/reset-password/:token',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    validatePassword(body.password);

    const hashed = crypto.createHash('sha256').update(String(req.params.token)).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) throw new AppError('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn', 400);

    user.password = body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    sendOk(res, authPayload(user), { message: 'Đặt lại mật khẩu thành công' });
  }),
);

module.exports = router;
