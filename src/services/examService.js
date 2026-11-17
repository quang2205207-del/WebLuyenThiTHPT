const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const AppError = require('../utils/AppError');
const { validateQuestion } = require('../utils/questionValidator');
const { isObjectId } = require('../utils/validators');

const MAX_QUESTIONS_PER_EXAM = 200;

// Cập nhật số câu hỏi và tổng hệ số của đề sau khi câu hỏi thay đổi.
async function syncExamStats(examId) {
  const [agg] = await Question.aggregate([
    { $match: { exam: new mongoose.Types.ObjectId(String(examId)) } },
    { $group: { _id: null, count: { $sum: 1 }, totalWeight: { $sum: '$weight' } } },
  ]);
  await Exam.findByIdAndUpdate(examId, {
    questionCount: agg ? agg.count : 0,
    totalWeight: agg ? Math.round(agg.totalWeight * 100) / 100 : 0,
  });
}

// Validate cả danh sách câu hỏi; gom mọi lỗi theo từng câu để form hiển thị một lần.
function validateQuestionList(rawList) {
  if (!Array.isArray(rawList)) throw new AppError('questions phải là một mảng', 400);
  if (rawList.length > MAX_QUESTIONS_PER_EXAM) {
    throw new AppError(`Mỗi đề thi tối đa ${MAX_QUESTIONS_PER_EXAM} câu hỏi`, 400);
  }

  const allErrors = [];
  const items = [];
  rawList.forEach((raw, index) => {
    const { value, errors } = validateQuestion(raw);
    if (errors.length) {
      errors.forEach((message) => allErrors.push({ index, message: `Câu ${index + 1}: ${message}` }));
    } else {
      items.push({ id: isObjectId(raw._id) ? raw._id : null, value });
    }
  });

  if (allErrors.length) {
    throw new AppError('Dữ liệu câu hỏi không hợp lệ', 400, { errors: allErrors });
  }
  return items;
}

/**
 * Đồng bộ danh sách câu hỏi của đề theo form (thứ tự mảng = thứ tự câu):
 *  - item có _id thuộc đề này  -> cập nhật (giữ nguyên _id để không mất kết quả cũ)
 *  - item không có _id         -> thêm mới
 *  - câu cũ không còn trong mảng -> xoá
 */
async function replaceExamQuestions(examId, items) {
  const existing = await Question.find({ exam: examId }).select('_id').lean();
  const existingIds = new Set(existing.map((q) => String(q._id)));
  const keepIds = new Set();
  const ops = [];

  items.forEach((item, index) => {
    const data = { ...item.value, order: index, exam: examId };
    if (item.id && existingIds.has(item.id) && !keepIds.has(item.id)) {
      keepIds.add(item.id);
      ops.push({ updateOne: { filter: { _id: item.id, exam: examId }, update: { $set: data } } });
    } else {
      ops.push({ insertOne: { document: data } });
    }
  });

  const removeIds = [...existingIds].filter((id) => !keepIds.has(id));
  if (removeIds.length) ops.push({ deleteMany: { filter: { _id: { $in: removeIds } } } });
  if (ops.length) await Question.bulkWrite(ops);
}

async function getExamWithQuestions(examId) {
  const exam = await Exam.findById(examId)
    .populate('subject', 'name code')
    .populate('block', 'name code')
    .lean();
  if (!exam) return null;
  exam.questions = await Question.find({ exam: examId }).sort({ order: 1, _id: 1 }).lean();
  return exam;
}

module.exports = {
  MAX_QUESTIONS_PER_EXAM,
  syncExamStats,
  validateQuestionList,
  replaceExamQuestions,
  getExamWithQuestions,
};
