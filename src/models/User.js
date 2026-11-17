const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config/env');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Vui lòng nhập họ tên'], trim: true, maxlength: 100 },
    email: {
      type: String,
      required: [true, 'Vui lòng nhập email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['admin', 'student'], default: 'student' },
    phone: { type: String, trim: true, maxlength: 20, default: '' },
    avatar: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    passwordChangedAt: Date,
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

// Mã hoá mật khẩu (bcrypt) mỗi khi mật khẩu thay đổi.
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, config.bcryptRounds);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// true nếu mật khẩu đổi sau thời điểm token được cấp (iat tính bằng giây).
userSchema.methods.changedPasswordAfter = function changedPasswordAfter(iat) {
  if (!this.passwordChangedAt) return false;
  return Math.floor(this.passwordChangedAt.getTime() / 1000) > iat;
};

// Tạo token đặt lại mật khẩu: trả về token thô (gửi qua email), lưu bản băm SHA-256.
userSchema.methods.createResetToken = function createResetToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(raw).digest('hex');
  this.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
  return raw;
};

userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
