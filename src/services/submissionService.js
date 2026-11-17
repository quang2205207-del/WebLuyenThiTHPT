const config = require('../config/env');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const AppError = require('../utils/AppError');
const { gradeSubmission, normalizeSelected, SCALE } = require('../utils/grading');

const graceMs = () => config.submitGraceSeconds * 1000;

const loadQuestions = (examId) => Question.find({ exam: examId }).sort({ order: 1, _id: 1 }).lean();

// Câu hỏi gửi cho thí sinh khi đang làm: KHÔNG kèm đáp án đúng và lời giải.
function toSafeQuestion(q) {
  return {
    _id: q._id,
    order: q.order,
    type: q.type,
    content: q.content,
    images: q.images || [],
    options: (q.options || []).map((o) => ({ text: o.text, image: o.image })),
    weight: q.weight,
  };
}

// Quá hạn kể cả thời gian du di (grace) -> không nhận đáp án mới từ client nữa.
const isPastGrace = (submission, now = new Date()) =>
  now.getTime() > submission.deadline.getTime() + graceMs();

/**
 * Chuẩn hoá đáp án client gửi lên. Chấp nhận:
 *  - mảng: [{ question: "<id>", selected: [0, 2] }]  (hoặc questionId thay cho question)
 *  - object: { "<questionId>": [0, 2] }  (tiện khi state Redux là map)
 * Trả về null nếu client không gửi answers; ngược lại mảng { question, selected } chỉ gồm câu có chọn.
 */
function sanitizeAnswers(raw, questions) {
  if (raw === undefined || raw === null) return null;

  let entries;
  if (Array.isArray(raw)) {
    entries = raw.map((a) => [a && (a.question !== undefined ? a.question : a.questionId), a && a.selected]);
  } else if (typeof raw === 'object') {
    entries = Object.entries(raw);
  } else {
    throw new AppError('answers không hợp lệ', 400);
  }
  if (entries.length > 1000) throw new AppError('answers quá dài', 400);

  const byId = new Map(questions.map((q) => [String(q._id), q]));
  const result = new Map();
  entries.forEach(([qid, selected]) => {
    const q = byId.get(String(qid));
    if (!q) return; // bỏ qua câu không thuộc đề
    const sel = normalizeSelected(selected, q.options.length);
    if (sel.length) result.set(String(q._id), sel);
  });
  return [...result].map(([question, selected]) => ({ question, selected }));
}

/**
 * Chấm và chốt bài (chỉ chuyển trạng thái 1 lần, an toàn khi nộp trùng).
 *  - Nộp trong hạn (hoặc trong thời gian du di): chấm theo answers gửi lên (nếu không gửi thì theo bản đã lưu).
 *  - Nộp quá hạn: bỏ qua answers gửi lên, chấm theo bản đã tự lưu trước đó và đánh dấu late = true.
 */
async function finalizeSubmission(submission, { rawAnswers, now = new Date() } = {}) {
  const questions = await loadQuestions(submission.exam);
  const late = isPastGrace(submission, now);

  const saved = submission.answers.map((a) => ({
    question: a.question,
    selected: Array.from(a.selected || []),
  }));
  const fromClient = late ? null : sanitizeAnswers(rawAnswers, questions);
  const graded = gradeSubmission(questions, fromClient || saved);

  const endedAt = new Date(Math.min(now.getTime(), submission.deadline.getTime()));
  const timeSpentSeconds = Math.max(0, Math.round((endedAt.getTime() - submission.startedAt.getTime()) / 1000));

  const updated = await Submission.findOneAndUpdate(
    { _id: submission._id, status: 'in_progress' },
    {
      $set: {
        status: 'graded',
        answers: graded.answers,
        score: graded.score,
        earnedWeight: graded.earnedWeight,
        totalWeight: graded.totalWeight,
        correctCount: graded.correctCount,
        answeredCount: graded.answeredCount,
        totalQuestions: graded.totalQuestions,
        submittedAt: endedAt,
        timeSpentSeconds,
        late,
      },
    },
    { new: true },
  );
  if (!updated) {
    throw new AppError('Bài thi này đã được nộp trước đó', 409, { code: 'ALREADY_SUBMITTED' });
  }

  await Exam.updateOne({ _id: submission.exam }, { $inc: { attemptCount: 1 } });
  return { submission: updated, questions };
}

// Nếu bài đang làm đã quá hạn (kể cả du di) thì tự chốt. Trả về true nếu vừa chốt.
async function closeIfExpired(submission, now = new Date()) {
  if (submission.status !== 'in_progress' || !isPastGrace(submission, now)) return false;
  try {
    await finalizeSubmission(submission, { now });
  } catch (err) {
    if (err.code !== 'ALREADY_SUBMITTED') throw err;
  }
  return true;
}

// Dữ liệu để thí sinh làm bài / tiếp tục làm bài.
function buildInProgressPayload(submission, exam, questions, now = new Date()) {
  const remainingSeconds = Math.max(0, Math.ceil((submission.deadline.getTime() - now.getTime()) / 1000));
  return {
    status: 'in_progress',
    submission: {
      id: submission._id,
      examId: submission.exam,
      startedAt: submission.startedAt,
      deadline: submission.deadline,
      serverTime: now, // client dùng để hiệu chỉnh đồng hồ đếm ngược
      remainingSeconds,
      durationSeconds: exam.durationMinutes * 60,
      answers: submission.answers.map((a) => ({
        question: a.question,
        selected: Array.from(a.selected || []),
      })),
    },
    exam: {
      id: exam._id,
      title: exam.title,
      durationMinutes: exam.durationMinutes,
      questionCount: questions.length,
      totalWeight: questions.reduce((sum, q) => sum + q.weight, 0),
    },
    questions: questions.map(toSafeQuestion),
  };
}

// Kết quả chi tiết sau khi chấm: đáp án đúng, lời giải, đáp án đã chọn.
function buildResult(submission, exam, questions) {
  const s = typeof submission.toObject === 'function' ? submission.toObject() : submission;
  const byId = new Map(questions.map((q) => [String(q._id), q]));

  const details = (s.answers || [])
    .map((a) => {
      const q = byId.get(String(a.question));
      if (!q) return null; // câu hỏi đã bị xoá khỏi đề sau khi nộp
      return {
        question: toSafeQuestion(q),
        selected: a.selected,
        correctAnswers: q.correctAnswers,
        isCorrect: a.isCorrect,
        earned: a.earned,
        weight: a.weight,
        explanation: q.explanation,
        explanationImages: q.explanationImages || [],
      };
    })
    .filter(Boolean);

  return {
    status: 'graded',
    submission: {
      id: s._id,
      examId: s.exam,
      startedAt: s.startedAt,
      submittedAt: s.submittedAt,
      timeSpentSeconds: s.timeSpentSeconds,
      late: s.late,
    },
    exam: exam
      ? {
          id: exam._id,
          title: exam.title,
          subject: exam.subject,
          year: exam.year,
          difficulty: exam.difficulty,
          durationMinutes: exam.durationMinutes,
        }
      : null,
    result: {
      score: s.score,
      scale: SCALE,
      earnedWeight: s.earnedWeight,
      totalWeight: s.totalWeight,
      totalQuestions: s.totalQuestions,
      correctCount: s.correctCount,
      wrongCount: s.answeredCount - s.correctCount,
      unansweredCount: s.totalQuestions - s.answeredCount,
      answeredCount: s.answeredCount,
    },
    details,
  };
}

module.exports = {
  loadQuestions,
  toSafeQuestion,
  isPastGrace,
  sanitizeAnswers,
  finalizeSubmission,
  closeIfExpired,
  buildInProgressPayload,
  buildResult,
};
