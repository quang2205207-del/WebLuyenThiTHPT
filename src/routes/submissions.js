const express = require('express');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendOk } = require('../utils/http');
const { assertObjectId, getBody, idParam } = require('../utils/validators');
const {
  buildInProgressPayload,
  buildResult,
  closeIfExpired,
  finalizeSubmission,
  isPastGrace,
  loadQuestions,
  sanitizeAnswers,
} = require('../services/submissionService');
const { protect } = require('../middleware/auth');

/**
 * Luồng làm bài:
 *   POST /start          -> server ghi startedAt và tính deadline, trả câu hỏi (không kèm đáp án)
 *   PUT  /:id/progress   -> tự động lưu đáp án đang chọn (gọi định kỳ / khi chọn đáp án)
 *   POST /:id/submit     -> nộp bài, server chấm điểm và trả kết quả + lời giải chi tiết
 *   GET  /:id            -> tiếp tục bài đang làm, hoặc xem lại kết quả đã chấm
 * Mọi kiểm tra hết giờ đều dựa trên đồng hồ của server, không tin thời gian client gửi lên.
 */
const router = express.Router();
router.use(protect);
router.param('id', idParam);

const isAdmin = (req) => req.user.role === 'admin';

// Bài của chính mình (dùng cho lưu tiến độ và nộp bài).
async function findOwned(req) {
  const submission = await Submission.findOne({ _id: req.params.id, user: req.user._id });
  if (!submission) throw new AppError('Không tìm thấy bài làm', 404);
  return submission;
}

// POST /api/submissions/start { examId }
router.post(
  '/start',
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    const examId = assertObjectId(body.examId, 'examId');

    const exam = await Exam.findById(examId).lean();
    if (!exam || (!exam.isPublished && !isAdmin(req))) throw new AppError('Không tìm thấy đề thi', 404);
    if (!exam.questionCount) throw new AppError('Đề thi chưa có câu hỏi', 400);

    const now = new Date();
    const inProgressFilter = { user: req.user._id, exam: exam._id, status: 'in_progress' };

    let submission = await Submission.findOne(inProgressFilter);
    if (submission && isPastGrace(submission, now)) {
      await closeIfExpired(submission, now); // bài cũ đã quá hạn: chốt rồi mở lượt mới
      submission = null;
    }

    let resumed = Boolean(submission);
    if (!submission) {
      try {
        submission = await Submission.create({
          user: req.user._id,
          exam: exam._id,
          subject: exam.subject,
          startedAt: now,
          deadline: new Date(now.getTime() + exam.durationMinutes * 60 * 1000),
        });
      } catch (err) {
        if (err.code !== 11000) throw err;
        // Hai yêu cầu start đồng thời: lấy bài vừa được tạo
        submission = await Submission.findOne(inProgressFilter);
        resumed = true;
      }
    }
    if (!submission) throw new AppError('Không thể bắt đầu bài thi, vui lòng thử lại', 500);

    const questions = await loadQuestions(exam._id);
    sendOk(res, buildInProgressPayload(submission, exam, questions, now), {
      status: resumed ? 200 : 201,
      message: resumed ? 'Tiếp tục bài đang làm' : 'Bắt đầu làm bài',
    });
  }),
);

// GET /api/submissions/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    let submission = await Submission.findById(req.params.id);
    const isOwner = submission && String(submission.user) === String(req.user._id);
    // Người khác (không phải admin) không biết bài này có tồn tại hay không
    if (!submission || (!isOwner && !isAdmin(req))) throw new AppError('Không tìm thấy bài làm', 404);

    const now = new Date();
    if (await closeIfExpired(submission, now)) submission = await Submission.findById(submission._id);

    const exam = await Exam.findById(submission.exam).populate('subject', 'name code').lean();
    if (!exam) throw new AppError('Đề thi của bài làm này không còn tồn tại', 404);
    const questions = await loadQuestions(submission.exam);

    if (submission.status === 'in_progress') {
      // Bài đang làm chỉ chủ bài được xem (có câu hỏi), admin không xem hộ
      if (!isOwner) throw new AppError('Bài làm chưa nộp, chỉ người làm bài mới xem được', 403);
      return sendOk(res, buildInProgressPayload(submission, exam, questions, now));
    }
    return sendOk(res, buildResult(submission, exam, questions));
  }),
);

// PUT /api/submissions/:id/progress { answers } — gửi TOÀN BỘ đáp án hiện tại (ghi đè bản đã lưu)
// answers: [{ question: "<id>", selected: [0] }] hoặc { "<questionId>": [0] }
router.put(
  '/:id/progress',
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    if (body.answers === undefined) throw new AppError('Thiếu answers', 400);

    const submission = await findOwned(req);
    if (submission.status !== 'in_progress') {
      throw new AppError('Bài thi đã được nộp', 409, { code: 'ALREADY_SUBMITTED' });
    }

    const now = new Date();
    if (now.getTime() > submission.deadline.getTime()) {
      await closeIfExpired(submission, now);
      throw new AppError('Đã hết giờ làm bài', 409, { code: 'TIME_UP' });
    }

    const questions = await Question.find({ exam: submission.exam }).select('_id options').lean();
    const answers = sanitizeAnswers(body.answers, questions) || [];
    await Submission.updateOne({ _id: submission._id, status: 'in_progress' }, { $set: { answers } });

    sendOk(res, {
      savedAt: now,
      answeredCount: answers.length,
      remainingSeconds: Math.max(0, Math.ceil((submission.deadline.getTime() - now.getTime()) / 1000)),
    });
  }),
);

// POST /api/submissions/:id/submit { answers? }
router.post(
  '/:id/submit',
  asyncHandler(async (req, res) => {
    const body = getBody(req);
    const submission = await findOwned(req);
    if (submission.status !== 'in_progress') {
      throw new AppError('Bài thi này đã được nộp trước đó', 409, { code: 'ALREADY_SUBMITTED' });
    }

    const { submission: graded, questions } = await finalizeSubmission(submission, {
      rawAnswers: body.answers,
      now: new Date(),
    });
    const exam = await Exam.findById(graded.exam).populate('subject', 'name code').lean();

    sendOk(res, buildResult(graded, exam, questions), {
      message: graded.late
        ? 'Đã quá giờ làm bài — hệ thống chấm theo các đáp án đã lưu tự động'
        : 'Nộp bài thành công',
    });
  }),
);

module.exports = router;
