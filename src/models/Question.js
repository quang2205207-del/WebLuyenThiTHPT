const mongoose = require('mongoose');
const { QUESTION_TYPES } = require('../utils/questionValidator');

const optionSchema = new mongoose.Schema(
  {
    text: { type: String, trim: true, default: '' },
    image: { type: String, trim: true },
  },
  { _id: false },
);

// Dữ liệu được validate bằng utils/questionValidator.js trước khi lưu.
const questionSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    order: { type: Number, default: 0 },
    type: { type: String, enum: QUESTION_TYPES, default: 'single_choice' },
    content: { type: String, required: [true, 'Thiếu nội dung câu hỏi'], trim: true },
    images: { type: [String], default: [] },
    options: { type: [optionSchema], default: [] },
    correctAnswers: { type: [Number], default: [] }, // chỉ số đáp án đúng, bắt đầu từ 0
    explanation: { type: String, trim: true, default: '' },
    explanationImages: { type: [String], default: [] },
    weight: { type: Number, default: 1, min: 0.01, max: 100 }, // hệ số điểm
  },
  { timestamps: true },
);

questionSchema.index({ exam: 1, order: 1 });

module.exports = mongoose.model('Question', questionSchema);
