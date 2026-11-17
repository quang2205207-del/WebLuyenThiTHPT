const { round2 } = require('./http');

const SCALE = 10; // thang điểm 10

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

// Chuẩn hoá đáp án đã chọn: số nguyên, trong phạm vi đáp án, không trùng, sắp xếp tăng dần.
function normalizeSelected(selected, optionCount) {
  const arr = Array.isArray(selected)
    ? selected
    : selected === undefined || selected === null
      ? []
      : [selected];
  return [...new Set(arr.filter((n) => Number.isInteger(n) && n >= 0 && n < optionCount))].sort(
    (a, b) => a - b,
  );
}

/**
 * Chấm bài theo hệ số câu hỏi.
 *  điểm = (tổng hệ số các câu đúng / tổng hệ số cả đề) × 10
 * Câu nhiều đáp án: chỉ tính đúng khi chọn khớp hoàn toàn tập đáp án đúng (không chấm điểm từng phần).
 *
 * @param {Array<{_id, options, correctAnswers, weight}>} questions
 * @param {Array<{question, selected}>} answers
 */
function gradeSubmission(questions, answers) {
  const given = new Map((answers || []).map((a) => [String(a.question), a]));
  let earned = 0;
  let total = 0;
  let correctCount = 0;
  let answeredCount = 0;

  const graded = questions.map((q) => {
    const a = given.get(String(q._id));
    const selected = normalizeSelected(a && Array.from(a.selected || []), q.options.length);
    const correctSet = [...q.correctAnswers].sort((x, y) => x - y);
    const isCorrect = selected.length > 0 && sameSet(selected, correctSet);
    const weight = q.weight;

    total += weight;
    if (selected.length > 0) answeredCount += 1;
    if (isCorrect) {
      earned += weight;
      correctCount += 1;
    }
    return { question: q._id, selected, isCorrect, earned: isCorrect ? weight : 0, weight };
  });

  return {
    answers: graded,
    earnedWeight: round2(earned),
    totalWeight: round2(total),
    correctCount,
    answeredCount,
    totalQuestions: questions.length,
    score: total > 0 ? round2((earned / total) * SCALE) : 0,
  };
}

module.exports = { SCALE, normalizeSelected, gradeSubmission };
