// Kiểm tra nhanh không cần MongoDB: chỉ chạm các đường đi bị chặn trước khi truy vấn DB.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

let server;
let base;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const call = (path, options = {}) =>
  fetch(base + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  }).then(async (res) => ({ status: res.status, body: await res.json() }));

test('GET /api/health', async () => {
  const { status, body } = await call('/api/health');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.status, 'ok');
});

test('đường dẫn không tồn tại trả 404 dạng JSON', async () => {
  const { status, body } = await call('/api/khong-co');
  assert.equal(status, 404);
  assert.equal(body.success, false);
});

test('JSON hỏng trả 400', async () => {
  const { status, body } = await call('/api/auth/login', { method: 'POST', body: '{hong' });
  assert.equal(status, 400);
  assert.equal(body.success, false);
});

test('đăng ký thiếu/sai dữ liệu trả 400', async () => {
  const bad = [
    {},
    { name: 'A', email: 'khong-phai-email', password: 'Abcdef12' },
    { name: 'A', email: 'a@b.co', password: 'ngan1' },
    { name: 'A', email: 'a@b.co', password: 'khongcoso' },
  ];
  for (const payload of bad) {
    const { status } = await call('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    assert.equal(status, 400, JSON.stringify(payload));
  }
});

test('đăng nhập chặn NoSQL injection qua object', async () => {
  const { status } = await call('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: { $ne: null }, password: 'x' }),
  });
  assert.equal(status, 400);
});

test('các API cần đăng nhập trả 401 khi không có token', async () => {
  const routes = [
    ['GET', '/api/auth/me'],
    ['GET', '/api/users/me'],
    ['GET', '/api/users'],
    ['POST', '/api/exams'],
    ['GET', '/api/questions'],
    ['POST', '/api/submissions/start'],
    ['GET', '/api/stats/overview'],
    ['GET', '/api/stats/leaderboard'],
  ];
  for (const [method, path] of routes) {
    const { status } = await call(path, { method, body: method === 'POST' ? '{}' : undefined });
    assert.equal(status, 401, `${method} ${path}`);
  }
});

test('token giả bị từ chối', async () => {
  const { status, body } = await call('/api/users/me', { headers: { Authorization: 'Bearer abc.def.ghi' } });
  assert.equal(status, 401);
  assert.equal(body.code, 'TOKEN_INVALID');
});

test('id sai định dạng trả 400 trước khi chạm DB', async () => {
  const { status } = await call('/api/subjects/khong-phai-objectid');
  assert.equal(status, 400);
});
