const mongoose = require('mongoose');

const DIFFICULTIES = ['easy', 'medium', 'hard'];

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Vui lòng nhập tiêu đề đề thi'], trim: true, maxlength: 200 },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    block: { type: mongoose.Schema.Types.ObjectId, ref: 'Block', default: null },
    year: { type: Number, min: 2000, max: 2100 },
    difficulty: { type: String, enum: DIFFICULTIES, default: 'medium' },
    durationMinutes: { type: Number, required: true, min: 1, max: 600 },
    description: { type: String, trim: true, default: '', maxlength: 2000 },
    isPublished: { type: Boolean, default: false },

    // Các trường tổng hợp (server tự cập nhật, client không ghi trực tiếp)
    questionCount: { type: Number, default: 0 },
    totalWeight: { type: Number, default: 0 },
    attemptCount: { type: Number, default: 0 }, // số lượt đã nộp bài

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

examSchema.index({ isPublished: 1, createdAt: -1 });
examSchema.index({ subject: 1, year: -1 });
examSchema.index({ attemptCount: -1 });

const Exam = mongoose.model('Exam', examSchema);
Exam.DIFFICULTIES = DIFFICULTIES;

module.exports = Exam;
