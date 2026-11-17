const express = require('express');
const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Subject = require('../models/Subject');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendOk, parsePagination, buildPagination, round2 } = require('../utils/http');
const { assertObjectId, queryString } = require('../utils/validators');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const ObjectId = (id) => new mongoose.Types.ObjectId(id);

// Admin có thể xem thống kê của người khác bằng ?userId=; người dùng thường luôn xem của chính mình.
function targetUserId(req) {
  const asked = queryString(req.query.userId);
  if (asked && req.user.role === 'admin') return ObjectId(assertObjectId(asked, 'userId'));
  return req.user._id;
}

function parseDate(value, label) {
  const str = queryString(value);
  if (!str) return undefined;
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) throw new AppError(`${label} không hợp lệ (dùng định dạng YYYY-MM-DD)`, 400);
  return date;
}

// GET /api/stats/history?exam=&subject=&from=&to=&sort=newest|oldest|score&page=&limit=
// Lịch sử các lần làm bài đã nộp.
router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const filter = { user: targetUserId(req), status: 'graded' };
    const exam = queryString(req.query.exam);
    if (exam) filter.exam = assertObjectId(exam, 'exam');
    const subject = queryString(req.query.subject);
    if (subject) filter.subject = assertObjectId(subject, 'subject');

    const from = parseDate(req.query.from, 'from');
    const to = parseDate(req.query.to, 'to');
    if (from || to) {
      filter.submittedAt = {};
      if (from) filter.submittedAt.$gte = from;
      if (to) filter.submittedAt.$lte = new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1); // gồm cả ngày "to"
    }

    const sorts = {
      newest: { submittedAt: -1, _id: -1 },
      oldest: { submittedAt: 1, _id: 1 },
      score: { score: -1, submittedAt: -1, _id: -1 },
    };
    const sort = sorts[queryString(req.query.sort)] || sorts.newest;
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });

    const [rows, total] = await Promise.all([
      Submission.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('exam', 'title year difficulty durationMinutes')
        .populate('subject', 'name code')
        .lean(),
      Submission.countDocuments(filter),
    ]);

    const items = rows.map((s) => ({
      id: s._id,
      exam: s.exam,
      subject: s.subject,
      score: s.score,
      correctCount: s.correctCount,
      totalQuestions: s.totalQuestions,
      timeSpentSeconds: s.timeSpentSeconds,
      submittedAt: s.submittedAt,
      late: s.late,
    }));
    sendOk(res, items, { pagination: buildPagination({ page, limit }, total) });
  }),
);

// GET /api/stats/overview — số đề đã làm, điểm trung bình, điểm cao nhất, theo môn, 10 lần gần nhất
router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const userId = targetUserId(req);
    const match = { user: userId, status: 'graded' };

    const [summary, bySubjectRaw, recentRaw] = await Promise.all([
      Submission.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            avgScore: { $avg: '$score' },
            bestScore: { $max: '$score' },
            totalTimeSeconds: { $sum: '$timeSpentSeconds' },
            exams: { $addToSet: '$exam' },
          },
        },
      ]),
      Submission.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$subject',
            attempts: { $sum: 1 },
            avgScore: { $avg: '$score' },
            bestScore: { $max: '$score' },
          },
        },
        { $lookup: { from: Subject.collection.name, localField: '_id', foreignField: '_id', as: 'subject' } },
        { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            subject: { id: '$_id', name: '$subject.name', code: '$subject.code' },
            attempts: 1,
            avgScore: 1,
            bestScore: 1,
          },
        },
        { $sort: { attempts: -1 } },
      ]),
      Submission.find(match)
        .sort({ submittedAt: -1, _id: -1 })
        .limit(10)
        .populate('exam', 'title')
        .select('exam score submittedAt')
        .lean(),
    ]);

    const s = summary[0];
    sendOk(res, {
      totalAttempts: s ? s.totalAttempts : 0,
      distinctExams: s ? s.exams.length : 0,
      avgScore: s ? round2(s.avgScore) : 0,
      bestScore: s ? s.bestScore : 0,
      totalTimeSeconds: s ? s.totalTimeSeconds : 0,
      bySubject: bySubjectRaw.map((r) => ({ ...r, avgScore: round2(r.avgScore) })),
      // Từ cũ đến mới để vẽ biểu đồ xu hướng
      recent: recentRaw
        .map((r) => ({ id: r._id, exam: r.exam, score: r.score, submittedAt: r.submittedAt }))
        .reverse(),
    });
  }),
);

// GET /api/stats/leaderboard?exam=&subject=&limit=10&minExams=1
//  - có exam: xếp hạng theo lần làm tốt nhất của mỗi người trên đề đó (điểm cao, cùng điểm thì làm nhanh hơn)
//  - không có exam: xếp hạng theo điểm trung bình các đề (mỗi đề lấy lần tốt nhất); lọc thêm theo subject được
router.get(
  '/leaderboard',
  asyncHandler(async (req, res) => {
    const examId = queryString(req.query.exam);
    const subjectId = queryString(req.query.subject);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const minExams = Math.max(parseInt(req.query.minExams, 10) || 1, 1);

    const match = { status: 'graded' };
    if (examId) match.exam = ObjectId(assertObjectId(examId, 'exam'));
    if (subjectId) match.subject = ObjectId(assertObjectId(subjectId, 'subject'));

    const pipeline = [
      { $match: match },
      { $sort: { score: -1, timeSpentSeconds: 1, submittedAt: 1 } },
      // Sau khi sắp xếp, $first = lần làm tốt nhất của mỗi (người, đề)
      {
        $group: {
          _id: { user: '$user', exam: '$exam' },
          score: { $first: '$score' },
          timeSpentSeconds: { $first: '$timeSpentSeconds' },
        },
      },
    ];

    if (examId) {
      pipeline.push(
        { $project: { _id: 0, user: '$_id.user', score: 1, timeSpentSeconds: 1, examsTaken: { $literal: 1 } } },
        { $sort: { score: -1, timeSpentSeconds: 1 } },
      );
    } else {
      pipeline.push(
        {
          $group: {
            _id: '$_id.user',
            score: { $avg: '$score' },
            examsTaken: { $sum: 1 },
            timeSpentSeconds: { $sum: '$timeSpentSeconds' },
          },
        },
        { $match: { examsTaken: { $gte: minExams } } },
        { $project: { _id: 0, user: '$_id', score: 1, examsTaken: 1, timeSpentSeconds: 1 } },
        { $sort: { score: -1, examsTaken: -1, timeSpentSeconds: 1 } },
      );
    }

    pipeline.push(
      { $limit: limit },
      { $lookup: { from: User.collection.name, localField: 'user', foreignField: '_id', as: 'u' } },
      { $unwind: '$u' },
      {
        $project: {
          score: 1,
          examsTaken: 1,
          timeSpentSeconds: 1,
          user: { id: '$u._id', name: '$u.name', avatar: '$u.avatar' }, // không lộ email
        },
      },
    );

    const rows = await Submission.aggregate(pipeline).allowDiskUse(true);
    sendOk(
      res,
      rows.map((r, i) => ({
        rank: i + 1,
        user: r.user,
        score: round2(r.score),
        examsTaken: r.examsTaken,
        timeSpentSeconds: r.timeSpentSeconds,
      })),
    );
  }),
);

module.exports = router;
