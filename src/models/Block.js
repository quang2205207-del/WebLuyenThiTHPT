const mongoose = require('mongoose');

// Khối thi, ví dụ A00 = Toán + Lý + Hoá.
const blockSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Vui lòng nhập mã khối'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },
    name: { type: String, required: [true, 'Vui lòng nhập tên khối'], trim: true, maxlength: 100 },
    description: { type: String, trim: true, default: '', maxlength: 1000 },
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  },
  { timestamps: true },
);

module.exports = mongoose.model('Block', blockSchema);
