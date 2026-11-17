const { test } = require('node:test');
const assert = require('node:assert/strict');
const { gradeSubmission } = require('../src/utils/grading');
const { validateQuestion } = require('../src/utils/questionValidator');
const { sanitizeAnswers } = require('../src/services/submissionService');
const { validateQuestionList } = require('../src/services/examService');

const opts = (n) => Array.from({ length: n }, (_, i) => ({ text: `Đáp án ${i}` }));

const questions = [
  { _id: 'q1', options: opts(4), correctAnswers: [1], weight: 1 },
  { _id: 'q2', options: opts(4), correctAnswers: [0, 2], weight: 2 },
  { _id: 'q3', options: opts(2), correctAnswers: [0], weight: 1 },
];

test('chấm theo hệ số: (1 + 2) / 4 × 10 = 7.5', () => {
  const r = gradeSubmission(questions, [
    { question: 'q1', selected: [1] },
    { question: 'q2', selected: [2, 0] }, // thứ tự không quan trọng
    { question: 'q3', selected: [1] }, // sai
  ]);
  assert.equal(r.score, 7.5);
  assert.equal(r.earnedWeight, 3);
  assert.equal(r.totalWeight, 4);
  assert.equal(r.correctCount, 2);
  assert.equal(r.answeredCount, 3);
  assert.equal(r.totalQuestions, 3);
});

test('đúng hết = 10 điểm, bỏ trống hết = 0 điểm', () => {
  const all = gradeSubmission(questions, [
    { question: 'q1', selected: [1] },
    { question: 'q2', selected: [0, 2] },
    { question: 'q3', selected: [0] },
  ]);
  assert.equal(all.score, 10);

  const none = gradeSubmission(questions, []);
  assert.equal(none.score, 0);
  assert.equal(none.answeredCount, 0);
});

test('câu nhiều đáp án: thiếu hoặc thừa đều không có điểm', () => {
  const missing = gradeSubmission([questions[1]], [{ question: 'q2', selected: [0] }]);
  assert.equal(missing.correctCount, 0);
  const extra = gradeSubmission([questions[1]], [{ question: 'q2', selected: [0, 1, 2] }]);
  assert.equal(extra.correctCount, 0);
});

test('chỉ số ngoài phạm vi hoặc trùng lặp bị loại khi chấm', () => {
  const r = gradeSubmission([questions[0]], [{ question: 'q1', selected: [1, 1, 9, -1, 'x'] }]);
  assert.equal(r.answers[0].isCorrect, true);
  assert.deepEqual(r.answers[0].selected, [1]);
});

test('điểm làm tròn 2 chữ số khi hệ số lẻ', () => {
  const qs = [
    { _id: 'a', options: opts(2), correctAnswers: [0], weight: 0.5 },
    { _id: 'b', options: opts(2), correctAnswers: [0], weight: 1 },
    { _id: 'c', options: opts(2), correctAnswers: [0], weight: 1 },
  ];
  const r = gradeSubmission(qs, [{ question: 'a', selected: [0] }]);
  assert.equal(r.score, 2); // 0.5 / 2.5 × 10
});

test('validate câu hỏi hợp lệ: single_choice', () => {
  const { value, errors } = validateQuestion({
    content: '  1 + 1 = ?  ',
    options: ['1', '2', '3', '4'],
    correctAnswers: [1],
  });
  assert.deepEqual(errors, []);
  assert.equal(value.type, 'single_choice');
  assert.equal(value.content, '1 + 1 = ?');
  assert.equal(value.weight, 1);
  assert.equal(value.options[1].text, '2');
});

test('validate: single_choice không được có 2 đáp án đúng', () => {
  const { errors } = validateQuestion({ content: 'x', options: ['a', 'b'], correctAnswers: [0, 1] });
  assert.ok(errors.some((e) => e.includes('đúng 1 đáp án đúng')));
});

test('validate: multiple_choice cho phép nhiều đáp án đúng', () => {
  const { errors, value } = validateQuestion({
    type: 'multiple_choice',
    content: 'x',
    options: ['a', 'b', 'c'],
    correctAnswers: [2, 0],
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(value.correctAnswers, [0, 2]);
});

test('validate: true_false tự có 2 lựa chọn Đúng/Sai', () => {
  const { errors, value } = validateQuestion({ type: 'true_false', content: 'x', correctAnswers: [0] });
  assert.deepEqual(errors, []);
  assert.deepEqual(value.options.map((o) => o.text), ['Đúng', 'Sai']);
});

test('validate: bắt các lỗi thường gặp', () => {
  assert.ok(validateQuestion({ content: '', options: ['a', 'b'], correctAnswers: [0] }).errors.length > 0);
  assert.ok(validateQuestion({ content: 'x', options: ['a'], correctAnswers: [0] }).errors.length > 0);
  assert.ok(validateQuestion({ content: 'x', options: ['a', 'b'] }).errors.length > 0);
  assert.ok(validateQuestion({ content: 'x', options: ['a', 'b'], correctAnswers: [5] }).errors.length > 0);
  assert.ok(validateQuestion({ content: 'x', options: ['a', ''], correctAnswers: [0] }).errors.length > 0);
  assert.ok(validateQuestion({ content: 'x', options: ['a', 'b'], correctAnswers: [0], weight: 0 }).errors.length > 0);
  assert.ok(validateQuestion({ type: 'abc', content: 'x', options: ['a', 'b'], correctAnswers: [0] }).errors.length > 0);
  assert.ok(
    validateQuestion({ content: 'x', options: ['a', 'b'], correctAnswers: [0], images: ['javascript:alert(1)'] })
      .errors.length > 0,
  );
});

test('validateQuestionList gom lỗi theo số thứ tự câu', () => {
  assert.throws(
    () =>
      validateQuestionList([
        { content: 'ok', options: ['a', 'b'], correctAnswers: [0] },
        { content: '', options: ['a', 'b'], correctAnswers: [0] },
      ]),
    (err) => err.statusCode === 400 && err.errors.some((e) => e.index === 1 && e.message.startsWith('Câu 2')),
  );
});

test('sanitizeAnswers nhận cả dạng mảng và dạng map, bỏ câu lạ', () => {
  const qs = [
    { _id: 'q1', options: opts(4) },
    { _id: 'q2', options: opts(4) },
  ];
  assert.deepEqual(sanitizeAnswers([{ question: 'q1', selected: [1] }, { questionId: 'zzz', selected: [0] }], qs), [
    { question: 'q1', selected: [1] },
  ]);
  assert.deepEqual(sanitizeAnswers({ q2: [3, 3, 9], q1: [] }, qs), [{ question: 'q2', selected: [3] }]);
  assert.equal(sanitizeAnswers(undefined, qs), null);
  assert.throws(() => sanitizeAnswers('abc', qs), (err) => err.statusCode === 400);
});
