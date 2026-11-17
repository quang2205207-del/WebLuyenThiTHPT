const { URL_RE } = require('./validators');

const QUESTION_TYPES = ['single_choice', 'multiple_choice', 'true_false'];
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 8;

const letter = (i) => String.fromCharCode(65 + i);

function cleanUrls(list, label, errors) {
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list)) {
    errors.push(`${label} phải là mảng URL`);
    return [];
  }
  if (list.length > 10) errors.push(`${label} tối đa 10 ảnh`);
  const out = [];
  list.forEach((u) => {
    if (typeof u !== 'string' || u.length > 2000 || !URL_RE.test(u.trim())) {
      errors.push(`${label} chứa URL không hợp lệ`);
    } else {
      out.push(u.trim());
    }
  });
  return out;
}

/**
 * Validate + chuẩn hoá 1 câu hỏi.
 * Trả về { value, errors } — errors rỗng nghĩa là hợp lệ.
 *
 * Dạng câu hỏi (type):
 *  - single_choice   : 2–8 đáp án, đúng 1 đáp án đúng
 *  - multiple_choice : 2–8 đáp án, ≥ 1 đáp án đúng (chấm đúng khi chọn khớp hoàn toàn)
 *  - true_false      : đúng 2 lựa chọn (mặc định "Đúng"/"Sai"), đúng 1 đáp án đúng
 * correctAnswers là mảng chỉ số đáp án (bắt đầu từ 0).
 */
function validateQuestion(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { value: null, errors: ['Câu hỏi phải là một object'] };
  }

  const type = input.type === undefined ? 'single_choice' : input.type;
  const typeOk = QUESTION_TYPES.includes(type);
  if (!typeOk) errors.push(`Dạng câu hỏi không hợp lệ (chọn: ${QUESTION_TYPES.join(', ')})`);

  const content = typeof input.content === 'string' ? input.content.trim() : '';
  if (!content) errors.push('Thiếu nội dung câu hỏi (content)');
  else if (content.length > 5000) errors.push('Nội dung câu hỏi tối đa 5000 ký tự');

  let rawOptions = [];
  if (input.options !== undefined && !Array.isArray(input.options)) {
    errors.push('options phải là mảng');
  } else if (Array.isArray(input.options)) {
    rawOptions = input.options;
  }
  if (type === 'true_false' && rawOptions.length === 0) {
    rawOptions = [{ text: 'Đúng' }, { text: 'Sai' }];
  }

  const options = [];
  rawOptions.forEach((o, i) => {
    const text =
      typeof o === 'string' ? o.trim() : o && typeof o.text === 'string' ? o.text.trim() : '';
    const image =
      o && typeof o === 'object' && typeof o.image === 'string' && o.image.trim()
        ? o.image.trim()
        : undefined;
    if (image && !URL_RE.test(image)) errors.push(`Đáp án ${letter(i)}: URL ảnh không hợp lệ`);
    if (!text && !image) errors.push(`Đáp án ${letter(i)} đang trống`);
    if (text.length > 1000) errors.push(`Đáp án ${letter(i)} tối đa 1000 ký tự`);
    options.push({ text, image });
  });

  if (typeOk) {
    if (type === 'true_false') {
      if (options.length !== 2) errors.push('Câu đúng/sai phải có đúng 2 lựa chọn');
    } else if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
      errors.push(`Câu trắc nghiệm phải có từ ${MIN_OPTIONS} đến ${MAX_OPTIONS} đáp án`);
    }
  }

  let correct = input.correctAnswers;
  if (typeof correct === 'number') correct = [correct];
  let correctAnswers = [];
  if (!Array.isArray(correct) || correct.length === 0) {
    errors.push('Cần chọn ít nhất một đáp án đúng (correctAnswers)');
  } else if (!correct.every((n) => Number.isInteger(n) && n >= 0 && n < options.length)) {
    errors.push('correctAnswers phải là chỉ số (bắt đầu từ 0) nằm trong danh sách đáp án');
  } else if (new Set(correct).size !== correct.length) {
    errors.push('correctAnswers bị trùng');
  } else if (type !== 'multiple_choice' && correct.length !== 1) {
    errors.push('Câu chọn một đáp án chỉ được có đúng 1 đáp án đúng');
  } else {
    correctAnswers = [...correct].sort((a, b) => a - b);
  }

  const weight = input.weight === undefined ? 1 : Number(input.weight);
  if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
    errors.push('Hệ số điểm (weight) phải lớn hơn 0 và không quá 100');
  }

  let explanation = '';
  if (input.explanation !== undefined && input.explanation !== null) {
    if (typeof input.explanation !== 'string') errors.push('Lời giải (explanation) phải là chuỗi');
    else if (input.explanation.length > 5000) errors.push('Lời giải tối đa 5000 ký tự');
    else explanation = input.explanation.trim();
  }

  const images = cleanUrls(input.images, 'Ảnh câu hỏi (images)', errors);
  const explanationImages = cleanUrls(input.explanationImages, 'Ảnh lời giải (explanationImages)', errors);

  return {
    value: { type, content, images, options, correctAnswers, explanation, explanationImages, weight },
    errors,
  };
}

module.exports = { QUESTION_TYPES, validateQuestion };
