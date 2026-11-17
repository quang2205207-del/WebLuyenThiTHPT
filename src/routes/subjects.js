const express = require('express');
const Subject = require('../models/Subject');
const Block = require('../models/Block');
const Exam = require('../models/Exam');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendOk } = require('../utils/http');
const {
  getBody,
  idParam,
  optionalString,
  queryBool,
  requireString,
} = require('../utils/validators');
const { optionalAuth, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.param('id', idParam);

const isAdmin = (req) => req.user && req.user.role === 'admin';

// GET /api/subjects — công khai; học sinh chỉ thấy môn đang bật, admin thấy tất cả (lọc ?isActive=)
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const filter = {};
    if (!isAdmin(req)) filter.isActive = true;
    else {
      const isActive = queryBool(req.query.isActive);
      if (isActive !== undefined) filter.isActive = isActive;
    }
    sendOk(res, await Subject.find(filter).sort({ name: 1 }).lean());
  }),
);

router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const subject = await Subject.findById(req.params.id).lean();
    if (!subject || (!subject.isActive && !isAdmin(req))) throw new AppError('Không tìm thấy môn học', 404);
    sendOk(res, subject);
  }),
);

router.post(
  '/',
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    const subject = await Subject.create({
      name: requireString(body.name, 'Tên môn học', { max: 100 }),
      code: requireString(body.code, 'Mã môn học', { max: 20 }),
      description: optionalString(body.description, 'Mô tả', { max: 1000 }),
    });
    sendOk(res, subject, { status: 201, message: 'Tạo môn học thành công' });
  }),
);

router.put(
  '/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    const subject = await Subject.findById(req.params.id);
    if (!subject) throw new AppError('Không tìm thấy môn học', 404);

    if (body.name !== undefined) subject.name = requireString(body.name, 'Tên môn học', { max: 100 });
    if (body.code !== undefined) subject.code = requireString(body.code, 'Mã môn học', { max: 20 });
    if (body.description !== undefined) subject.description = optionalString(body.description, 'Mô tả', { max: 1000 });
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') throw new AppError('isActive phải là true hoặc false', 400);
      subject.isActive = body.isActive;
    }
    await subject.save();
    sendOk(res, subject, { message: 'Cập nhật môn học thành công' });
  }),
);

// DELETE /api/subjects/:id — không cho xoá khi còn đề thi thuộc môn này (hãy tắt isActive thay vì xoá)
router.delete(
  '/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const subject = await Subject.findById(req.params.id);
    if (!subject) throw new AppError('Không tìm thấy môn học', 404);
    if (await Exam.exists({ subject: subject._id })) {
      throw new AppError('Môn học đang có đề thi, không thể xóa. Hãy tắt kích hoạt môn học thay vì xóa.', 409);
    }
    await Block.updateMany({ subjects: subject._id }, { $pull: { subjects: subject._id } });
    await subject.deleteOne();
    sendOk(res, undefined, { message: 'Đã xóa môn học' });
  }),
);

module.exports = router;
