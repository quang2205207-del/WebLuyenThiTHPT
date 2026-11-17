/**
 * Tạo dữ liệu khởi đầu (chạy lại nhiều lần vẫn an toàn):
 *   - 1 tài khoản admin (theo ADMIN_EMAIL / ADMIN_PASSWORD trong .env)
 *   - Các môn học và khối thi phổ biến
 *   - 1 đề thi mẫu đã xuất bản để thử luồng làm bài
 * Chạy: npm run seed
 */
const mongoose = require('mongoose');
const config = require('../src/config/env');
const User = require('../src/models/User');
const Subject = require('../src/models/Subject');
const Block = require('../src/models/Block');
const Exam = require('../src/models/Exam');
const Question = require('../src/models/Question');
const { syncExamStats } = require('../src/services/examService');

const SUBJECTS = [
  { code: 'TOAN', name: 'Toán' },
  { code: 'LY', name: 'Vật lý' },
  { code: 'HOA', name: 'Hóa học' },
  { code: 'SINH', name: 'Sinh học' },
  { code: 'VAN', name: 'Ngữ văn' },
  { code: 'ANH', name: 'Tiếng Anh' },
];

const BLOCKS = [
  { code: 'A00', name: 'Khối A00', subjects: ['TOAN', 'LY', 'HOA'] },
  { code: 'A01', name: 'Khối A01', subjects: ['TOAN', 'LY', 'ANH'] },
  { code: 'B00', name: 'Khối B00', subjects: ['TOAN', 'HOA', 'SINH'] },
  { code: 'D01', name: 'Khối D01', subjects: ['TOAN', 'VAN', 'ANH'] },
];

const SAMPLE_EXAM = {
  title: 'Đề thi thử Toán - Đề mẫu 01',
  year: 2025,
  difficulty: 'easy',
  durationMinutes: 15,
  description: 'Đề mẫu để thử nghiệm luồng làm bài và chấm điểm.',
  questions: [
    {
      type: 'single_choice',
      content: 'Đạo hàm của hàm số y = x² là:',
      options: [{ text: "y' = x" }, { text: "y' = 2x" }, { text: "y' = 2" }, { text: "y' = x²" }],
      correctAnswers: [1],
      explanation: '(xⁿ)\' = n·xⁿ⁻¹ nên (x²)\' = 2x.',
    },
    {
      type: 'single_choice',
      content: 'Giá trị của log₂(8) bằng:',
      options: [{ text: '2' }, { text: '3' }, { text: '4' }, { text: '8' }],
      correctAnswers: [1],
      explanation: 'Vì 2³ = 8 nên log₂(8) = 3.',
    },
    {
      type: 'multiple_choice',
      content: 'Những số nào sau đây là số nguyên tố?',
      options: [{ text: '2' }, { text: '9' }, { text: '11' }, { text: '15' }],
      correctAnswers: [0, 2],
      explanation: '9 = 3·3 và 15 = 3·5 là hợp số; 2 và 11 chỉ có hai ước là 1 và chính nó.',
      weight: 2,
    },
    {
      type: 'true_false',
      content: 'Hàm số y = sin x tuần hoàn với chu kỳ 2π.',
      options: [{ text: 'Đúng' }, { text: 'Sai' }],
      correctAnswers: [0],
      explanation: 'sin(x + 2π) = sin x với mọi x.',
    },
    {
      type: 'single_choice',
      content: 'Tập nghiệm của phương trình x² − 5x + 6 = 0 là:',
      options: [{ text: '{1; 6}' }, { text: '{2; 3}' }, { text: '{−2; −3}' }, { text: '{−1; −6}' }],
      correctAnswers: [1],
      explanation: 'x² − 5x + 6 = (x − 2)(x − 3) = 0 nên x = 2 hoặc x = 3.',
    },
  ],
};

async function findOrCreate(Model, filter, data) {
  let doc = await Model.findOne(filter);
  if (!doc) {
    doc = await Model.create(data);
    return { doc, created: true };
  }
  return { doc, created: false };
}

async function main() {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  await mongoose.connection.syncIndexes();

  // Admin
  const { name, email, password } = config.seedAdmin;
  let admin = await User.findOne({ email });
  if (!admin) {
    admin = await User.create({ name, email, password, role: 'admin' });
    console.log(`✔ Đã tạo admin: ${email}`);
  } else {
    if (admin.role !== 'admin') {
      admin.role = 'admin';
      await admin.save();
    }
    console.log(`• Admin đã tồn tại: ${email} (giữ nguyên mật khẩu)`);
  }

  // Môn học
  const subjectByCode = {};
  for (const s of SUBJECTS) {
    const { doc, created } = await findOrCreate(Subject, { code: s.code }, s);
    subjectByCode[s.code] = doc;
    if (created) console.log(`✔ Môn học: ${s.name}`);
  }

  // Khối thi
  const blockByCode = {};
  for (const b of BLOCKS) {
    const { doc, created } = await findOrCreate(Block, { code: b.code }, {
      code: b.code,
      name: b.name,
      subjects: b.subjects.map((c) => subjectByCode[c]._id),
    });
    blockByCode[b.code] = doc;
    if (created) console.log(`✔ Khối thi: ${b.code}`);
  }

  // Đề mẫu
  const { questions, ...examData } = SAMPLE_EXAM;
  const existing = await Exam.findOne({ title: examData.title });
  if (!existing) {
    const exam = await Exam.create({
      ...examData,
      subject: subjectByCode.TOAN._id,
      block: blockByCode.A00._id,
      isPublished: true,
      createdBy: admin._id,
    });
    await Question.insertMany(questions.map((q, i) => ({ ...q, exam: exam._id, order: i })));
    await syncExamStats(exam._id);
    console.log(`✔ Đề mẫu: ${examData.title} (${questions.length} câu)`);
  } else {
    console.log('• Đề mẫu đã tồn tại');
  }

  console.log('Hoàn tất.');
}

main()
  .catch((err) => {
    console.error('❌ Seed thất bại:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
