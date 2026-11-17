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
  isObjectId,
  optionalString,
  requireString,
} = require('../utils/validators');
const { optionalAuth, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.param('id', idParam);

// Kiểm tra danh sách môn thuộc khối: là mảng id hợp lệ, không trùng và tồn tại.
async function parseSubjectIds(value) {
  if (!Array.isArray(value)) throw new AppError('subjects phải là mảng id môn học', 400);
  if (!value.every(isObjectId)) throw new AppError('subjects chứa id không hợp lệ', 400);
  const ids = [...new Set(value)];
  const found = await Subject.countDocuments({ _id: { $in: ids } });
  if (found !== ids.length) throw new AppError('Có môn học trong danh sách không tồn tại', 400);
  return ids;
}

// GET /api/blocks — công khai
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const blocks = await Block.find().sort({ code: 1 }).populate('subjects', 'name code').lean();
    sendOk(res, blocks);
  }),
);

router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const block = await Block.findById(req.params.id).populate('subjects', 'name code').lean();
    if (!block) throw new AppError('Không tìm thấy khối thi', 404);
    sendOk(res, block);
  }),
);

router.post(
  '/',
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    const data = {
      code: requireString(body.code, 'Mã khối', { max: 20 }),
      name: requireString(body.name, 'Tên khối', { max: 100 }),
      description: optionalString(body.description, 'Mô tả', { max: 1000 }),
      subjects: body.subjects === undefined ? [] : await parseSubjectIds(body.subjects),
    };
    const block = await Block.create(data);
    sendOk(res, await Block.findById(block._id).populate('subjects', 'name code').lean(), {
      status: 201,
      message: 'Tạo khối thi thành công',
    });
  }),
);

router.put(
  '/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    const block = await Block.findById(req.params.id);
    if (!block) throw new AppError('Không tìm thấy khối thi', 404);

    if (body.code !== undefined) block.code = requireString(body.code, 'Mã khối', { max: 20 });
    if (body.name !== undefined) block.name = requireString(body.name, 'Tên khối', { max: 100 });
    if (body.description !== undefined) block.description = optionalString(body.description, 'Mô tả', { max: 1000 });
    if (body.subjects !== undefined) block.subjects = await parseSubjectIds(body.subjects);
    await block.save();

    sendOk(res, await Block.findById(block._id).populate('subjects', 'name code').lean(), {
      message: 'Cập nhật khối thi thành công',
    });
  }),
);

router.delete(
  '/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const block = await Block.findById(req.params.id);
    if (!block) throw new AppError('Không tìm thấy khối thi', 404);
    if (await Exam.exists({ block: block._id })) {
      throw new AppError('Khối thi đang có đề thi, không thể xóa', 409);
    }
    await block.deleteOne();
    sendOk(res, undefined, { message: 'Đã xóa khối thi' });
  }),
);

module.exports = router;
