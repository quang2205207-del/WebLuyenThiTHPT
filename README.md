# Exam API — API dùng chung cho website luyện thi trắc nghiệm

Backend **Node.js + Express + MongoDB (Mongoose)** dùng chung cho cả nhóm. Mỗi bạn phụ trách một nhóm route (mỗi nhóm là **một file riêng** trong `src/routes/`) nên làm song song ít bị đụng file.

| Thành viên | Phần việc | File chính |
|---|---|---|
| Đào Nhật Quang | Tài khoản, phân quyền, deploy | `routes/auth.js`, `routes/users.js`, `middleware/auth.js`, `render.yaml` |
| Đinh Văn Thặng | Ngân hàng đề thi, môn học, khối thi | `routes/exams.js`, `routes/subjects.js`, `routes/blocks.js`, `routes/questions.js`, `utils/questionValidator.js`, `services/examService.js` |
| Hồ Công Chính | Làm bài, chấm điểm | `routes/submissions.js`, `services/submissionService.js`, `utils/grading.js` |
| Ngô Huy Tuấn | Tìm kiếm, lịch sử, thống kê | `routes/stats.js` (+ phần lọc/phân trang trong `routes/exams.js`) |

## Chạy nhanh

```bash
npm install
cp .env.example .env      # điền MONGODB_URI và JWT_SECRET
npm run seed              # tạo admin, môn học, khối thi, 1 đề mẫu
npm run dev               # http://localhost:5000
npm test                  # test logic chấm điểm, validate câu hỏi, các đường đi bị chặn
```

Tài khoản admin mặc định lấy từ `ADMIN_EMAIL` / `ADMIN_PASSWORD` trong `.env` (mặc định `admin@example.com` / `Admin12345` — **hãy đổi trước khi deploy**).

## Quy ước chung

**Xác thực:** gửi header `Authorization: Bearer <token>`. Token nhận được khi đăng ký / đăng nhập / đặt lại mật khẩu / đổi mật khẩu. Frontend (Vercel) và API (Render) khác domain nên dùng Bearer token, không dùng cookie.

**Phản hồi thành công**
```json
{ "success": true, "message": "...", "data": { }, "pagination": { "page": 1, "limit": 12, "total": 40, "totalPages": 4, "hasNext": true, "hasPrev": false } }
```
`message` và `pagination` chỉ có khi phù hợp. Nhóm user luôn bọc trong `data.user`; đăng nhập/đăng ký trả `data: { token, user }`.

**Phản hồi lỗi**
```json
{ "success": false, "message": "Nội dung lỗi (tiếng Việt)", "errors": [ { "index": 1, "message": "Câu 2: ..." } ], "code": "TIME_UP" }
```
`errors` (chi tiết theo trường/câu) và `code` (mã máy đọc được) chỉ có ở một số lỗi. Mã HTTP: 400 dữ liệu sai · 401 chưa đăng nhập/token hết hạn · 403 không đủ quyền · 404 không thấy · 409 xung đột · 429 gửi quá nhiều.

Các `code` frontend nên xử lý: `TOKEN_EXPIRED`, `TOKEN_INVALID`, `NO_TOKEN` (→ về trang đăng nhập), `ACCOUNT_DISABLED`, `TIME_UP`, `ALREADY_SUBMITTED`, `EXAM_HAS_SUBMISSIONS`.

**Vai trò:** `admin` | `student`. Đăng ký công khai luôn tạo `student`; admin đầu tiên tạo bằng `npm run seed`, các admin sau do admin tạo/đổi vai trò.

**ID** là ObjectId 24 ký tự hex; ID sai định dạng trả 400.

## Danh sách endpoint

Ký hiệu quyền: 🌐 công khai · 🔑 cần đăng nhập · 👑 chỉ admin.

### Tài khoản — Quang

| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/auth/register` | 🌐 | `{ name, email, password }` → `{ token, user }` |
| POST | `/api/auth/login` | 🌐 | `{ email, password }` → `{ token, user }` |
| GET | `/api/auth/me` | 🔑 | Lấy user từ token (AuthContext gọi khi tải lại trang) |
| POST | `/api/auth/forgot-password` | 🌐 | `{ email }`. Luôn trả cùng một thông điệp. Dev: có thêm `data.resetToken` |
| POST | `/api/auth/reset-password/:token` | 🌐 | `{ password }` → `{ token, user }` |
| GET | `/api/users/me` | 🔑 | Hồ sơ cá nhân |
| PUT | `/api/users/me` | 🔑 | `{ name?, phone?, avatar? }` (avatar là URL) |
| PUT | `/api/users/me/password` | 🔑 | `{ currentPassword, newPassword }` → `{ token }` mới (token cũ bị vô hiệu) |
| GET | `/api/users` | 👑 | `?q=&role=&isActive=&page=&limit=` |
| POST | `/api/users` | 👑 | `{ name, email, password, role? }` |
| GET | `/api/users/:id` | 👑 | |
| PATCH | `/api/users/:id` | 👑 | `{ role?, isActive?, name? }` (không tự đổi vai trò / tự khóa mình) |
| DELETE | `/api/users/:id` | 👑 | Xóa user và toàn bộ bài làm của user |

Mật khẩu: 8–72 ký tự, có cả chữ và số. Mã hóa bằng bcrypt (`bcryptjs`). `ProtectedRoute` phía frontend nên dựa vào `user.role` lấy từ `/api/auth/me`.

### Môn học, khối thi — Thặng

| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/subjects` | 🌐 | Khách/học sinh chỉ thấy môn đang bật; admin lọc `?isActive=` |
| GET / POST / PUT / DELETE | `/api/subjects[/:id]` | 🌐 / 👑 | POST `{ name, code, description? }`. Không xóa được môn còn đề thi (hãy `isActive: false`) |
| GET | `/api/blocks` | 🌐 | Khối thi kèm danh sách môn |
| GET / POST / PUT / DELETE | `/api/blocks[/:id]` | 🌐 / 👑 | POST `{ code, name, subjects: [subjectId], description? }` (vd A00 = Toán, Lý, Hóa) |

### Đề thi & câu hỏi — Thặng (admin), tìm kiếm — Tuấn

| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/exams` | 🌐 | Danh sách + bộ lọc + phân trang (xem bên dưới). Khách/học sinh chỉ thấy đề đã xuất bản |
| GET | `/api/exams/filters` | 🌐 | `{ years, difficulties, subjects, blocks, sorts }` để dựng bộ lọc |
| GET | `/api/exams/:id` | 🌐 | Thông tin đề. **Admin** nhận thêm `questions[]` đầy đủ đáp án để đổ vào form sửa |
| POST | `/api/exams` | 👑 | Tạo đề, có thể kèm `questions[]` |
| PUT | `/api/exams/:id` | 👑 | Sửa đề; nếu gửi `questions[]` thì đồng bộ theo form |
| PATCH | `/api/exams/:id/publish` | 👑 | `{ isPublished: true/false }` (cần ≥ 1 câu hỏi mới xuất bản được) |
| DELETE | `/api/exams/:id` | 👑 | Đề đã có bài làm: cần `?force=true` (xóa luôn câu hỏi + bài làm) |
| GET | `/api/questions` | 👑 | `?exam=&type=&q=&page=&limit=` |
| GET / POST / PUT / DELETE | `/api/questions[/:id]` | 👑 | POST kèm `exam: "<examId>"`; PUT chỉ cần gửi trường muốn đổi |

**Lọc đề (`GET /api/exams`):**

| Query | Ví dụ | Ý nghĩa |
|---|---|---|
| `q` | `q=thử` | Tìm theo tiêu đề |
| `subject`, `block` | `subject=<id1>,<id2>` | Theo môn / khối (nhiều giá trị, ngăn cách bằng dấu phẩy) |
| `year` | `year=2024,2025` | Theo năm |
| `difficulty` | `difficulty=easy,medium` | `easy` / `medium` / `hard` |
| `sort` | `sort=popular` | `newest` (mặc định), `oldest`, `popular` (nhiều lượt làm nhất), `year_desc`, `year_asc`, `title` |
| `page`, `limit` | `page=2&limit=12` | Phân trang (limit mặc định 12, tối đa 50) |
| `published` | `published=false` | Chỉ admin: lọc theo trạng thái xuất bản |

Mỗi đề có `attemptCount` (số lượt đã nộp), `questionCount`, `totalWeight` do server tự cập nhật.

**Ví dụ tạo đề kèm câu hỏi**
```json
POST /api/exams
{
  "title": "Đề thi thử Toán 2025 - Đề 1",
  "subject": "<subjectId>",
  "block": "<blockId>",
  "year": 2025,
  "difficulty": "medium",
  "durationMinutes": 90,
  "isPublished": false,
  "questions": [
    {
      "type": "single_choice",
      "content": "Đạo hàm của y = x² là:",
      "images": ["https://.../hinh.png"],
      "options": [{ "text": "x" }, { "text": "2x" }, { "text": "2" }, { "text": "x²", "image": "https://.../a.png" }],
      "correctAnswers": [1],
      "explanation": "(xⁿ)' = n·xⁿ⁻¹",
      "explanationImages": [],
      "weight": 1
    }
  ]
}
```

**Quy tắc câu hỏi** (server validate, lỗi trả theo từng câu trong `errors[]`):

| `type` | Số đáp án | Đáp án đúng (`correctAnswers`, chỉ số từ 0) |
|---|---|---|
| `single_choice` (mặc định) | 2–8 | đúng 1 |
| `multiple_choice` | 2–8 | ≥ 1 |
| `true_false` | đúng 2 (mặc định "Đúng"/"Sai") | đúng 1 |

`weight` là hệ số điểm (> 0, tối đa 100, mặc định 1). Tối đa 200 câu/đề. **Ảnh là URL** (`http(s)`): frontend upload lên dịch vụ ảnh (Cloudinary, Imgur...) rồi gửi URL — API không lưu file vì ổ đĩa của Render là tạm thời.

**Sửa đề (`PUT` với `questions[]`):** câu có `_id` thuộc đề → cập nhật (giữ nguyên `_id`); câu không có `_id` → thêm mới; câu không còn trong mảng → xóa. Thứ tự mảng là thứ tự câu. Lưu ý: sửa đáp án đúng của đề đã có người làm **không** chấm lại các bài cũ.

### Làm bài & chấm điểm — Chính

Luồng chuẩn:

1. `POST /api/submissions/start` `{ examId }` → server ghi giờ bắt đầu, tính `deadline`, trả câu hỏi **không kèm đáp án đúng/lời giải**. Nếu đang có bài dở dang của đề này thì trả lại bài đó (`200`), nếu mới bắt đầu thì `201`.
2. Trong lúc làm: `PUT /api/submissions/:id/progress` `{ answers }` để tự lưu (gửi **toàn bộ** đáp án hiện tại, ghi đè bản trước). Dùng song song với Redux/LocalStorage ở client.
3. `POST /api/submissions/:id/submit` `{ answers? }` → chấm điểm, trả kết quả + lời giải chi tiết.
4. `GET /api/submissions/:id` → nếu đang làm: trả dữ liệu để tiếp tục; nếu đã nộp: trả kết quả (xem lại). Chỉ chủ bài hoặc admin xem được bài đã nộp.

`answers` nhận một trong hai dạng: `[{ "question": "<id>", "selected": [1] }]` hoặc map `{ "<questionId>": [1] }`. `selected` là mảng chỉ số đáp án (câu nhiều đáp án có thể có nhiều phần tử).

Dữ liệu trả khi đang làm: `{ status: "in_progress", submission: { id, startedAt, deadline, serverTime, remainingSeconds, durationSeconds, answers }, exam, questions }`. Đồng hồ đếm ngược nên tính theo `remainingSeconds` / lệch giữa `serverTime` và giờ máy.

Dữ liệu trả khi đã chấm: `{ status: "graded", submission, exam, result: { score, scale: 10, earnedWeight, totalWeight, totalQuestions, correctCount, wrongCount, unansweredCount }, details: [{ question, selected, correctAnswers, isCorrect, earned, weight, explanation, explanationImages }] }`.

**Cách tính điểm:** `điểm = (tổng hệ số các câu đúng ÷ tổng hệ số cả đề) × 10`, làm tròn 2 chữ số. Câu nhiều đáp án chỉ đúng khi chọn khớp hoàn toàn (không chấm từng phần).

**Chặn gian lận (server-side):**
- Giờ bắt đầu và hạn nộp do server ghi; không tin giờ từ client.
- Nộp trong hạn (hoặc trong `SUBMIT_GRACE_SECONDS` giây du di, mặc định 15s để bù độ trễ mạng): chấm theo `answers` gửi lên.
- Nộp quá hạn: bỏ qua `answers` gửi lên, chấm theo bản đã tự lưu bằng `/progress` và đánh dấu `late: true`. Lưu tiến độ sau hạn bị từ chối (`409`, `code: TIME_UP`).
- Bài bỏ dở quá hạn sẽ tự được chấm khi người dùng mở lại (`GET /:id` hoặc `start` lại).
- Mỗi người chỉ có 1 bài đang làm cho mỗi đề (có ràng buộc ở DB); nộp trùng trả `409 ALREADY_SUBMITTED`.
- Thời gian làm bài tối đa không vượt quá `durationMinutes` của đề.

### Lịch sử, thống kê, xếp hạng — Tuấn

| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/stats/history` | 🔑 | Lịch sử các lần đã nộp: `?exam=&subject=&from=YYYY-MM-DD&to=&sort=newest\|oldest\|score&page=&limit=` |
| GET | `/api/stats/overview` | 🔑 | `{ totalAttempts, distinctExams, avgScore, bestScore, totalTimeSeconds, bySubject[], recent[] }` (`recent` = 10 lần gần nhất, cũ → mới, để vẽ biểu đồ) |
| GET | `/api/stats/leaderboard` | 🔑 | `?exam=&subject=&limit=10&minExams=1` → `[{ rank, user: { id, name, avatar }, score, examsTaken, timeSpentSeconds }]` |

Admin có thể thêm `?userId=<id>` vào `history` và `overview` để xem của người khác.

Bảng xếp hạng: có `exam` → xếp theo lần làm tốt nhất của mỗi người trên đề đó (cùng điểm thì ai làm nhanh hơn xếp trên). Không có `exam` → xếp theo điểm trung bình của các đề (mỗi đề lấy lần tốt nhất), có thể lọc theo `subject`. Không trả email.

### Khác

`GET /api/health` → `{ status: "ok", db: "connected" | "disconnected" }` (Render dùng để kiểm tra sống).

## Biến môi trường

Xem `.env.example`. Bắt buộc: `MONGODB_URI`, `JWT_SECRET` (≥ 16 ký tự). Quan trọng: `CLIENT_URL` — danh sách origin của frontend được phép gọi API (CORS), cách nhau bằng dấu phẩy; phần tử đầu dùng để tạo link đặt lại mật khẩu (`<CLIENT_URL>/reset-password/<token>`). Quên mật khẩu cần SMTP (`SMTP_*`); chưa cấu hình thì ở dev link được in ra console.

## Deploy (Quang)

**API → Render** (khuyên dùng vì đây là server chạy liên tục):
1. Tạo MongoDB Atlas, lấy connection string, thêm IP `0.0.0.0/0` (hoặc IP của Render) vào Network Access.
2. Render → New → Blueprint, trỏ vào repo (đọc `render.yaml`). Điền `MONGODB_URI` và `CLIENT_URL` (URL Vercel của frontend, vd `https://ten-app.vercel.app`). `JWT_SECRET` được tự sinh.
3. Chạy `npm run seed` một lần (từ máy bạn với `MONGODB_URI` trỏ vào Atlas, hoặc Shell của Render) để tạo admin.
4. Gói free của Render ngủ sau một thời gian không dùng nên request đầu tiên chậm.

**Frontend → Vercel:** đặt biến môi trường trỏ tới URL API của Render (vd `VITE_API_URL`), và nhớ thêm URL Vercel vào `CLIENT_URL` của API. Preview deployment của Vercel có URL khác nhau mỗi lần nên cần thêm vào `CLIENT_URL` nếu muốn gọi API từ đó.

### Frontend tài khoản

Frontend React + Vite nằm trong `client/` (cần Node.js 20 trở lên). Chạy local:

```bash
npm install --prefix client
npm run dev --prefix client
```

Tạo `client/.env.local` với `VITE_API_URL=http://localhost:5000` nếu API chạy ở URL khác. Khi deploy Vercel, chọn `client/` làm Root Directory, framework preset `Vite`, và đặt `VITE_API_URL` thành URL API Render (không thêm `/api`). Vercel dùng `client/vercel.json` để chuyển các URL frontend về ứng dụng SPA. Những màn hình có sẵn: đăng nhập, đăng ký, quên/đặt lại mật khẩu, hồ sơ và đổi mật khẩu. `/admin` chỉ cho vai trò Admin; API vẫn là nơi kiểm tra quyền cuối cùng.

## Cấu trúc thư mục

```
src/
  app.js, server.js         khởi tạo Express, kết nối MongoDB
  config/env.js             đọc biến môi trường
  middleware/               auth (protect, optionalAuth, restrictTo), error
  models/                   User, Subject, Block, Exam, Question, Submission
  routes/                   auth, users, subjects, blocks, exams, questions, submissions, stats
  services/                 examService (đồng bộ câu hỏi), submissionService (chấm, chốt bài, dựng kết quả)
  utils/                    grading, questionValidator, validators, http (phân trang), token, email
scripts/seed.js             dữ liệu khởi đầu
test/                       node --test
```

## Lưu ý & giới hạn đã biết

- MongoDB bản đơn (không replica set) không có transaction; khi tạo đề kèm câu hỏi bị lỗi giữa chừng, API tự dọn dẹp thủ công.
- Đăng xuất là việc của client (xóa token); chưa có danh sách thu hồi token. Đổi mật khẩu sẽ vô hiệu mọi token cũ.
- Tìm kiếm tiêu đề dùng regex không phân biệt hoa thường; đủ cho quy mô đồ án, nếu dữ liệu lớn nên chuyển sang text index.
- Bảng xếp hạng dùng aggregation trực tiếp; nếu số bài làm rất lớn nên cache hoặc lưu bảng điểm tốt nhất riêng.
