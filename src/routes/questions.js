const express = require('express');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendOk, parsePagination, buildPagination } = require('../utils/http');
const {
  assertObjectId,
  escapeRegex,
  getBody,
  idParam,
  queryString,
} = require('../utils/validators');
const { QUESTION_TYPES, validateQuestion } = require('../utils/questionValidator');
const { syncExamStats } = require('../services/examService');
const { adminOnly } = require('../middleware/auth');

// Toàn bộ nhóm này chỉ dành cho Admin vì dữ liệu có đáp án đúng và lời giải.
const router = express.Router();
router.use(adminOnly);
router.param('id', idParam);

function throwValidation(errors) {
  throw new AppError('Dữ liệu câu hỏi không hợp lệ', 400, {
    errors: errors.map((message) => ({ message })),
  });
}

// GET /api/questions?exam=&type=&q=&page=&limit=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};
    const exam = queryString(req.query.exam);
    if (exam) filter.exam = assertObjectId(exam, 'exam');
    const type = queryString(req.query.type);
    if (type) {
      if (!QUESTION_TYPES.includes(type)) throw new AppError(`type phải thuộc: ${QUESTION_TYPES.join(', ')}`, 400);
      filter.type = type;
    }
    const q = queryString(req.query.q);
    if (q) filter.content = new RegExp(escapeRegex(q), 'i');

    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const [items, total] = await Promise.all([
      Question.find(filter).sort({ exam: 1, order: 1, _id: 1 }).skip(skip).limit(limit).lean(),
      Question.countDocuments(filter),
    ]);
    sendOk(res, items, { pagination: buildPagination({ page, limit }, total) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const question = await Question.findById(req.params.id).lean();
    if (!question) throw new AppError('Không tìm thấy câu hỏi', 404);
    sendOk(res, question);
  }),
);

// POST /api/questions — thêm một câu vào đề (body có exam: "<examId>")
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    const examId = assertObjectId(body.exam, 'exam');
    if (!(await Exam.exists({ _id: examId }))) throw new AppError('Đề thi không tồn tại', 400);

    const { value, errors } = validateQuestion(body);
    if (errors.length) throwValidation(errors);

    // Mặc định xếp cuối đề
    const order = Number.isInteger(body.order) && body.order >= 0
      ? body.order
      : await Question.countDocuments({ exam: examId });

    const question = await Question.create({ ...value, exam: examId, order });
    await syncExamStats(examId);
    sendOk(res, question, { status: 201, message: 'Thêm câu hỏi thành công' });
  }),
);

// PUT /api/questions/:id — sửa; chỉ cần gửi các trường muốn đổi, dữ liệu sau khi gộp sẽ được validate lại
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    const question = await Question.findById(req.params.id);
    if (!question) throw new AppError('Không tìm thấy câu hỏi', 404);

    const current = question.toObject();
    const merged = {
      type: current.type,
      content: current.content,
      images: current.images,
      options: current.options,
      correctAnswers: current.correctAnswers,
      explanation: current.explanation,
      explanationImages: current.explanationImages,
      weight: current.weight,
    };
    ['type', 'content', 'images', 'options', 'correctAnswers', 'explanation', 'explanationImages', 'weight'].forEach(
      (key) => {
        if (body[key] !== undefined) merged[key] = body[key];
      },
    );

    const { value, errors } = validateQuestion(merged);
    if (errors.length) throwValidation(errors);

    question.set(value);
    if (Number.isInteger(body.order) && body.order >= 0) question.order = body.order;
    await question.save();
    await syncExamStats(question.exam);
    sendOk(res, question, { message: 'Cập nhật câu hỏi thành công' });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const question = await Question.findById(req.params.id);
    if (!question) throw new AppError('Không tìm thấy câu hỏi', 404);

    const exam = await Exam.findById(question.exam);
    if (exam && exam.isPublished && exam.questionCount <= 1) {
      throw new AppError('Đề thi đã xuất bản phải còn ít nhất 1 câu hỏi. Hãy gỡ xuất bản trước khi xóa câu cuối.', 409);
    }

    await question.deleteOne();
    await syncExamStats(question.exam);
    sendOk(res, undefined, { message: 'Đã xóa câu hỏi' });
  }),
);

module.exports = router;
