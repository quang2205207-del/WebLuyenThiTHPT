const express = require('express');
const User = require('../models/User');
const Submission = require('../models/Submission');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendOk, parsePagination, buildPagination } = require('../utils/http');
const {
  escapeRegex,
  getBody,
  idParam,
  normalizeEmail,
  optionalString,
  optionalUrl,
  queryBool,
  queryString,
  requireString,
  validatePassword,
} = require('../utils/validators');
const { signToken } = require('../utils/token');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.param('id', idParam);

// ---------- Hồ sơ cá nhân (mọi người dùng đã đăng nhập) ----------

// GET /api/users/me
router.get('/me', protect, (req, res) => sendOk(res, { user: req.user }));

// PUT /api/users/me — cập nhật thông tin cá nhân
router.put(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    const user = await User.findById(req.user._id);

    if (body.name !== undefined) user.name = requireString(body.name, 'Họ tên', { max: 100 });
    if (body.phone !== undefined) user.phone = optionalString(body.phone, 'Số điện thoại', { max: 20 });
    if (body.avatar !== undefined) user.avatar = optionalUrl(body.avatar, 'Ảnh đại diện');
    await user.save();

    sendOk(res, { user }, { message: 'Cập nhật hồ sơ thành công' });
  }),
);

// PUT /api/users/me/password — đổi mật khẩu; trả token mới vì các token cũ bị vô hiệu
router.put(
  '/me/password',
  protect,
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    if (typeof body.currentPassword !== 'string' || !body.currentPassword) {
      throw new AppError('Vui lòng nhập mật khẩu hiện tại', 400);
    }
    validatePassword(body.newPassword, 'Mật khẩu mới');
    if (body.newPassword === body.currentPassword) {
      throw new AppError('Mật khẩu mới phải khác mật khẩu hiện tại', 400);
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(body.currentPassword))) {
      throw new AppError('Mật khẩu hiện tại không đúng', 400);
    }

    user.password = body.newPassword;
    await user.save();
    sendOk(res, { token: signToken(user) }, { message: 'Đổi mật khẩu thành công' });
  }),
);

// ---------- Quản trị tài khoản (Admin) ----------

// GET /api/users?q=&role=&isActive=&page=&limit=
router.get(
  '/',
  adminOnly,
  asyncHandler(async (req, res) => {
    const filter = {};
    const q = queryString(req.query.q);
    if (q) {
      const re = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: re }, { email: re }];
    }
    const role = queryString(req.query.role);
    if (role === 'admin' || role === 'student') filter.role = role;
    const isActive = queryBool(req.query.isActive);
    if (isActive !== undefined) filter.isActive = isActive;

    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);
    sendOk(res, users, { pagination: buildPagination({ page, limit }, total) });
  }),
);

// POST /api/users — admin tạo tài khoản (kể cả admin khác)
router.post(
  '/',
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    const name = requireString(body.name, 'Họ tên', { max: 100 });
    const email = normalizeEmail(body.email);
    validatePassword(body.password);
    const role = body.role === undefined ? 'student' : body.role;
    if (!['admin', 'student'].includes(role)) throw new AppError('Vai trò không hợp lệ (admin | student)', 400);

    if (await User.exists({ email })) throw new AppError('Email đã được sử dụng', 409);
    const user = await User.create({ name, email, password: body.password, role });
    sendOk(res, { user }, { status: 201, message: 'Tạo tài khoản thành công' });
  }),
);

// GET /api/users/:id
router.get(
  '/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);
    sendOk(res, { user });
  }),
);

// PATCH /api/users/:id — đổi vai trò / khoá / mở khoá / sửa tên
router.patch(
  '/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);
    const isSelf = String(user._id) === String(req.user._id);

    if (body.role !== undefined) {
      if (!['admin', 'student'].includes(body.role)) throw new AppError('Vai trò không hợp lệ (admin | student)', 400);
      if (isSelf && body.role !== user.role) throw new AppError('Không thể tự đổi vai trò của chính mình', 400);
      user.role = body.role;
    }
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') throw new AppError('isActive phải là true hoặc false', 400);
      if (isSelf && body.isActive === false) throw new AppError('Không thể tự khóa tài khoản của chính mình', 400);
      user.isActive = body.isActive;
    }
    if (body.name !== undefined) user.name = requireString(body.name, 'Họ tên', { max: 100 });

    await user.save();
    sendOk(res, { user }, { message: 'Cập nhật người dùng thành công' });
  }),
);

// DELETE /api/users/:id — xoá tài khoản và toàn bộ bài làm của tài khoản đó
router.delete(
  '/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    if (String(req.params.id) === String(req.user._id)) {
      throw new AppError('Không thể tự xóa tài khoản của chính mình', 400);
    }
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);

    await Submission.deleteMany({ user: user._id });
    await user.deleteOne();
    sendOk(res, undefined, { message: 'Đã xóa người dùng' });
  }),
);

module.exports = router;
