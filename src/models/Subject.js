const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Vui lòng nhập tên môn học'], unique: true, trim: true, maxlength: 100 },
    code: {
      type: String,
      required: [true, 'Vui lòng nhập mã môn học'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },
    description: { type: String, trim: true, default: '', maxlength: 1000 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Subject', subjectSchema);
