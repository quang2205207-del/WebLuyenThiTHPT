const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    selected: { type: [Number], default: [] },
    // Các trường dưới chỉ có sau khi chấm
    isCorrect: Boolean,
    earned: Number,
    weight: Number,
  },
  { _id: false },
);

const submissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }, // lưu sẵn để lọc/thống kê theo môn

    status: { type: String, enum: ['in_progress', 'graded'], default: 'in_progress' },
    startedAt: { type: Date, required: true },
    deadline: { type: Date, required: true }, // thời điểm hết giờ do SERVER tính
    submittedAt: Date,
    timeSpentSeconds: Number,
    late: { type: Boolean, default: false }, // true: quá giờ, server chấm theo đáp án đã lưu tự động

    answers: { type: [answerSchema], default: [] },

    score: Number, // thang 10
    earnedWeight: Number,
    totalWeight: Number,
    correctCount: Number,
    answeredCount: Number,
    totalQuestions: Number,
  },
  { timestamps: true },
);

// Mỗi người chỉ có tối đa 1 bài đang làm cho mỗi đề (chặn mở nhiều phiên song song).
submissionSchema.index(
  { user: 1, exam: 1 },
  { unique: true, partialFilterExpression: { status: 'in_progress' } },
);
submissionSchema.index({ user: 1, status: 1, submittedAt: -1 });
submissionSchema.index({ exam: 1, status: 1, score: -1 });

module.exports = mongoose.model('Submission', submissionSchema);
