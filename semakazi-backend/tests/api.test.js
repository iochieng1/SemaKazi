// Uses Node's built-in test runner and fetch — no extra test dependencies
// needed. Each test run gets its own throwaway SQLite file so tests never
// interfere with your real dev database.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const TEST_DB_PATH = path.join(__dirname, '.test-data', `test-${Date.now()}.db`);
process.env.DB_PATH = TEST_DB_PATH;
process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';

const createApp = require('../src/app');

let server;
let baseUrl;

test.before(() => {
  const app = createApp();
  server = app.listen(0); // port 0 = OS assigns a free port
  const { port } = server.address();
  baseUrl = `http://localhost:${port}`;
});

test.after(() => {
  server.close();
  fs.rmSync(path.dirname(TEST_DB_PATH), { recursive: true, force: true });
});

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test('health check returns ok', async () => {
  const { status, data } = await request('/api/health');
  assert.equal(status, 200);
  assert.equal(data.status, 'ok');
});

test('register creates a user and returns a token', async () => {
  const { status, data } = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Test Fundi', email: 'fundi@test.com', password: 'password123', role: 'fundi', trade: 'Plumber', location: 'Nairobi' }
  });
  assert.equal(status, 201);
  assert.ok(data.token);
  assert.equal(data.user.email, 'fundi@test.com');
});

test('register rejects a duplicate email', async () => {
  await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Dup', email: 'dup@test.com', password: 'password123' }
  });
  const { status, data } = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Dup Again', email: 'dup@test.com', password: 'password123' }
  });
  assert.equal(status, 409);
  assert.match(data.error, /already registered/i);
});

test('login succeeds with correct credentials and fails with wrong password', async () => {
  await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Login Test', email: 'login@test.com', password: 'correctpass' }
  });

  const good = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'login@test.com', password: 'correctpass' }
  });
  assert.equal(good.status, 200);
  assert.ok(good.data.token);

  const bad = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'login@test.com', password: 'wrongpass' }
  });
  assert.equal(bad.status, 401);
});

test('protected route rejects requests without a token', async () => {
  const { status, data } = await request('/api/proof-of-work', {
    method: 'POST',
    body: { media_url: 'https://example.com/x.jpg' }
  });
  assert.equal(status, 401);
  assert.ok(data.error);
});

test('profile search returns fundis with rating info', async () => {
  const reg = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Search Fundi', email: 'search@test.com', password: 'password123', role: 'fundi', trade: 'Mechanic', location: 'Mombasa' }
  });

  await request(`/api/reviews/${reg.data.user.id}`, {
    method: 'POST',
    body: { reviewer_name: 'A Client', rating: 4, comment: 'Solid work' }
  });

  const { status, data } = await request('/api/profiles?trade=Mechanic');
  assert.equal(status, 200);
  const found = data.find(f => f.email === undefined && f.trade === 'Mechanic');
  assert.ok(found);
  assert.equal(found.average_rating, 4);
  assert.equal(found.review_count, 1);
});

test('a user cannot edit another user\'s profile', async () => {
  const userA = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'User A', email: 'usera@test.com', password: 'password123' }
  });
  const userB = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'User B', email: 'userb@test.com', password: 'password123' }
  });

  const { status, data } = await request(`/api/profiles/${userB.data.user.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userA.data.token}` },
    body: { bio: 'Hijacked bio' }
  });

  assert.equal(status, 403);
  assert.ok(data.error);
});