const AppError = require('./AppError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const URL_RE = /^https?:\/\/\S+$/i;

const isObjectId = (value) => typeof value === 'string' && OBJECT_ID_RE.test(value);

function assertObjectId(value, label = 'ID') {
  if (!isObjectId(value)) throw new AppError(`${label} không hợp lệ`, 400);
  return value;
}

// Dùng: router.param('id', idParam)
function idParam(req, res, next, value) {
  if (!isObjectId(value)) return next(new AppError('ID không hợp lệ', 400));
  return next();
}

function getBody(req) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Body phải là một JSON object', 400);
  }
  return body;
}

function requireString(value, label, { max = 255 } = {}) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(`${label} không được để trống`, 400);
  }
  const v = value.trim();
  if (v.length > max) throw new AppError(`${label} tối đa ${max} ký tự`, 400);
  return v;
}

function optionalString(value, label, { max = 2000 } = {}) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new AppError(`${label} phải là chuỗi`, 400);
  const v = value.trim();
  if (v.length > max) throw new AppError(`${label} tối đa ${max} ký tự`, 400);
  return v;
}

function optionalUrl(value, label) {
  const v = optionalString(value, label, { max: 2000 });
  if (v && !URL_RE.test(v)) throw new AppError(`${label} phải là URL http(s) hợp lệ`, 400);
  return v;
}

function normalizeEmail(value) {
  const email = requireString(value, 'Email', { max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new AppError('Email không hợp lệ', 400);
  return email;
}

// bcrypt chỉ dùng 72 byte đầu nên giới hạn 72 ký tự.
function validatePassword(password, label = 'Mật khẩu') {
  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    password.length > 72 ||
    !/[A-Za-z]/.test(password) ||
    !/\d/.test(password)
  ) {
    throw new AppError(`${label} phải từ 8 đến 72 ký tự, gồm cả chữ và số`, 400);
  }
}

const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

// Query string -> chuỗi sạch (chặn kiểu ?a[$ne]=x trả về object).
const queryString = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const csv = (v) =>
  typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];
const queryBool = (v) => (v === 'true' ? true : v === 'false' ? false : undefined);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = {
  URL_RE,
  isObjectId,
  assertObjectId,
  idParam,
  getBody,
  requireString,
  optionalString,
  optionalUrl,
  normalizeEmail,
  validatePassword,
  pick,
  queryString,
  csv,
  queryBool,
  escapeRegex,
};
