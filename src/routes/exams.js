const express = require('express');
const Exam = require('../models/Exam');
const Subject = require('../models/Subject');
const Block = require('../models/Block');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendOk, parsePagination, buildPagination } = require('../utils/http');
const {
  assertObjectId,
  csv,
  escapeRegex,
  getBody,
  idParam,
  optionalString,
  queryBool,
  queryString,
  requireString,
} = require('../utils/validators');
const {
  getExamWithQuestions,
  replaceExamQuestions,
  syncExamStats,
  validateQuestionList,
} = require('../services/examService');
const { optionalAuth, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.param('id', idParam);

const isAdmin = (req) => req.user && req.user.role === 'admin';

const DIFFICULTY_LABELS = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' };

// Kiểu sắp xếp cho danh sách đề (?sort=)
const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  popular: { attemptCount: -1, createdAt: -1 }, // nhiều lượt làm nhất
  year_desc: { year: -1, createdAt: -1 },
  year_asc: { year: 1, createdAt: -1 },
  title: { title: 1 },
};

// ---------- Tìm kiếm & lọc đề thi ----------

function buildExamFilter(req) {
  const filter = {};

  // Học sinh/khách chỉ thấy đề đã xuất bản; admin lọc bằng ?published=true|false (mặc định: tất cả)
  if (!isAdmin(req)) filter.isPublished = true;
  else {
    const published = queryBool(req.query.published);
    if (published !== undefined) filter.isPublished = published;
  }

  const q = queryString(req.query.q);
  if (q) filter.title = new RegExp(escapeRegex(q), 'i');

  const subjects = csv(req.query.subject);
  if (subjects.length) {
    subjects.forEach((id) => assertObjectId(id, 'subject'));
    filter.subject = { $in: subjects };
  }

  const blocks = csv(req.query.block);
  if (blocks.length) {
    blocks.forEach((id) => assertObjectId(id, 'block'));
    filter.block = { $in: blocks };
  }

  const years = csv(req.query.year).map(Number);
  if (years.length) {
    if (!years.every(Number.isInteger)) throw new AppError('year không hợp lệ', 400);
    filter.year = { $in: years };
  }

  const difficulties = csv(req.query.difficulty);
  if (difficulties.length) {
    if (!difficulties.every((d) => Exam.DIFFICULTIES.includes(d))) {
      throw new AppError(`difficulty phải thuộc: ${Exam.DIFFICULTIES.join(', ')}`, 400);
    }
    filter.difficulty = { $in: difficulties };
  }

  return filter;
}

// GET /api/exams?q=&subject=&block=&year=&difficulty=&sort=&page=&limit=
// subject/block/year/difficulty nhận nhiều giá trị, ngăn cách bằng dấu phẩy.
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const filter = buildExamFilter(req);
    const sort = { ...(SORTS[queryString(req.query.sort)] || SORTS.newest), _id: -1 };
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 12, maxLimit: 50 });

    const [items, total] = await Promise.all([
      Exam.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('subject', 'name code')
        .populate('block', 'name code')
        .lean(),
      Exam.countDocuments(filter),
    ]);
    sendOk(res, items, { pagination: buildPagination({ page, limit }, total) });
  }),
);

// GET /api/exams/filters — dữ liệu dựng bộ lọc (môn, khối, năm, độ khó, kiểu sắp xếp)
router.get(
  '/filters',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const base = isAdmin(req) ? {} : { isPublished: true };
    const [years, subjects, blocks] = await Promise.all([
      Exam.distinct('year', base),
      Subject.find({ isActive: true }).select('name code').sort({ name: 1 }).lean(),
      Block.find().select('name code').sort({ code: 1 }).lean(),
    ]);
    sendOk(res, {
      years: years.filter((y) => y !== null && y !== undefined).sort((a, b) => b - a),
      difficulties: Exam.DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_LABELS[value] })),
      subjects,
      blocks,
      sorts: Object.keys(SORTS),
    });
  }),
);

// ---------- Chi tiết ----------

// GET /api/exams/:id — thông tin đề; admin nhận thêm toàn bộ câu hỏi kèm đáp án để sửa
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const exam = isAdmin(req)
      ? await getExamWithQuestions(req.params.id)
      : await Exam.findById(req.params.id)
          .populate('subject', 'name code')
          .populate('block', 'name code')
          .lean();
    if (!exam || (!exam.isPublished && !isAdmin(req))) throw new AppError('Không tìm thấy đề thi', 404);
    sendOk(res, exam);
  }),
);

// ---------- Quản trị (Admin) ----------

async function ensureExists(Model, id, label) {
  assertObjectId(String(id), label);
  if (!(await Model.exists({ _id: id }))) throw new AppError(`${label} không tồn tại`, 400);
}

// Validate các trường của đề. partial = true khi cập nhật (chỉ kiểm tra trường được gửi lên).
async function parseExamBody(body, { partial }) {
  const data = {};
  const has = (key) => body[key] !== undefined;

  if (!partial || has('title')) data.title = requireString(body.title, 'Tiêu đề', { max: 200 });

  if (!partial || has('subject')) {
    await ensureExists(Subject, body.subject, 'Môn học');
    data.subject = body.subject;
  }

  if (has('block')) {
    if (body.block === null || body.block === '') data.block = null;
    else {
      await ensureExists(Block, body.block, 'Khối thi');
      data.block = body.block;
    }
  }

  if (has('year')) {
    if (body.year === null || body.year === '') data.year = null;
    else {
      const year = Number(body.year);
      if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new AppError('Năm không hợp lệ (2000–2100)', 400);
      data.year = year;
    }
  }

  if (has('difficulty')) {
    if (!Exam.DIFFICULTIES.includes(body.difficulty)) {
      throw new AppError(`Độ khó phải thuộc: ${Exam.DIFFICULTIES.join(', ')}`, 400);
    }
    data.difficulty = body.difficulty;
  }

  if (!partial || has('durationMinutes')) {
    const minutes = Number(body.durationMinutes);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 600) {
      throw new AppError('Thời gian làm bài phải từ 1 đến 600 phút', 400);
    }
    data.durationMinutes = Math.round(minutes);
  }

  if (has('description')) data.description = optionalString(body.description, 'Mô tả', { max: 2000 });

  if (has('isPublished')) {
    if (typeof body.isPublished !== 'boolean') throw new AppError('isPublished phải là true hoặc false', 400);
    data.isPublished = body.isPublished;
  }

  return data;
}

// POST /api/exams — tạo đề, có thể kèm luôn danh sách câu hỏi (questions[])
router.post(
  '/',
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    const data = await parseExamBody(body, { partial: false });
    const questions = body.questions === undefined ? [] : validateQuestionList(body.questions);

    if (data.isPublished && questions.length === 0) {
      throw new AppError('Đề thi phải có ít nhất 1 câu hỏi mới được xuất bản', 400);
    }

    const exam = await Exam.create({ ...data, createdBy: req.user._id });
    try {
      if (questions.length) {
        await replaceExamQuestions(exam._id, questions);
        await syncExamStats(exam._id);
      }
    } catch (err) {
      // Mongo bản đơn không có transaction nên tự dọn dẹp khi lưu câu hỏi lỗi
      await Question.deleteMany({ exam: exam._id });
      await Exam.findByIdAndDelete(exam._id);
      throw err;
    }

    sendOk(res, await getExamWithQuestions(exam._id), { status: 201, message: 'Tạo đề thi thành công' });
  }),
);

// PUT /api/exams/:id — sửa đề; nếu gửi questions[] thì đồng bộ danh sách câu hỏi theo form
// (câu có _id: cập nhật, câu không có _id: thêm mới, câu không còn trong mảng: xoá)
router.put(
  '/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    const exam = await Exam.findById(req.params.id);
    if (!exam) throw new AppError('Không tìm thấy đề thi', 404);

    const data = await parseExamBody(body, { partial: true });
    const questions = body.questions === undefined ? null : validateQuestionList(body.questions);

    const finalCount = questions ? questions.length : exam.questionCount;
    const finalPublished = data.isPublished !== undefined ? data.isPublished : exam.isPublished;
    if (finalPublished && finalCount === 0) {
      throw new AppError('Đề thi đã xuất bản phải có ít nhất 1 câu hỏi', 400);
    }

    Object.assign(exam, data);
    await exam.save();
    if (questions) {
      await replaceExamQuestions(exam._id, questions);
      await syncExamStats(exam._id);
    }

    sendOk(res, await getExamWithQuestions(exam._id), { message: 'Cập nhật đề thi thành công' });
  }),
);

// PATCH /api/exams/:id/publish { isPublished: true|false }
router.patch(
  '/:id/publish',
  adminOnly,
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    if (typeof body.isPublished !== 'boolean') throw new AppError('isPublished phải là true hoặc false', 400);

    const exam = await Exam.findById(req.params.id);
    if (!exam) throw new AppError('Không tìm thấy đề thi', 404);
    if (body.isPublished && exam.questionCount === 0) {
      throw new AppError('Đề thi phải có ít nhất 1 câu hỏi mới được xuất bản', 400);
    }

    exam.isPublished = body.isPublished;
    await exam.save();
    sendOk(res, exam, { message: body.isPublished ? 'Đã xuất bản đề thi' : 'Đã gỡ đề thi' });
  }),
);

// DELETE /api/exams/:id — nếu đề đã có bài làm thì cần ?force=true (xoá luôn câu hỏi và bài làm)
router.delete(
  '/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);
    if (!exam) throw new AppError('Không tìm thấy đề thi', 404);

    const force = req.query.force === 'true';
    const submissionCount = await Submission.countDocuments({ exam: exam._id });
    if (submissionCount > 0 && !force) {
      throw new AppError(
        `Đề thi đã có ${submissionCount} bài làm. Hãy gỡ xuất bản, hoặc gọi lại với ?force=true để xóa cả bài làm.`,
        409,
        { code: 'EXAM_HAS_SUBMISSIONS' },
      );
    }

    await Submission.deleteMany({ exam: exam._id });
    await Question.deleteMany({ exam: exam._id });
    await exam.deleteOne();
    sendOk(res, undefined, { message: 'Đã xóa đề thi' });
  }),
);

module.exports = router;
