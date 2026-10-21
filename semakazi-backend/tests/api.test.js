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
process.env.ADMIN_TOKEN = 'test-admin-token';

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

  const reviewer = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'A Client', email: 'searchreviewer@test.com', password: 'password123', role: 'client' }
  });

  await request(`/api/reviews/${reg.data.user.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${reviewer.data.token}` },
    body: { rating: 4, comment: 'Solid work' }
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

test('reviews require authentication', async () => {
  const { status } = await request('/api/reviews/1', {
    method: 'POST',
    body: { rating: 5, comment: 'test' }
  });
  assert.equal(status, 401);
});

test('badge endorsement is deduplicated per endorser', async () => {
  const fundi = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Badge Fundi', email: 'badgefundi@test.com', password: 'password123', role: 'fundi', trade: 'Painter', location: 'Kisumu' }
  });
  const endorser = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Endorser', email: 'endorser@test.com', password: 'password123' }
  });

  const first = await request(`/api/badges/${fundi.data.user.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${endorser.data.token}` },
    body: { badge_name: 'Clean Finish' }
  });
  assert.equal(first.status, 201);

  const second = await request(`/api/badges/${fundi.data.user.id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${endorser.data.token}` },
    body: { badge_name: 'Clean Finish' }
  });
  assert.equal(second.status, 409);
});

test('a client can send a job request and the fundi sees it', async () => {
  const fundi = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Request Fundi', email: 'requestfundi@test.com', password: 'password123', role: 'fundi', trade: 'Plumber', location: 'Nakuru' }
  });
  const client = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Request Client', email: 'requestclient@test.com', password: 'password123', role: 'client' }
  });

  const created = await request('/api/requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${client.data.token}` },
    body: { fundi_id: fundi.data.user.id, message: 'Need a leak fixed' }
  });
  assert.equal(created.status, 201);

  const incoming = await request('/api/requests/incoming', {
    headers: { Authorization: `Bearer ${fundi.data.token}` }
  });
  assert.equal(incoming.status, 200);
  assert.equal(incoming.data.length, 1);
  assert.equal(incoming.data[0].client_name, 'Request Client');
});

async function register(name, email, role, extra = {}) {
  const { data } = await request('/api/auth/register', {
    method: 'POST',
    body: { name, email, password: 'password123', role, ...extra }
  });
  return { id: data.user.id, auth: { Authorization: `Bearer ${data.token}` } };
}

test('only clients can create reviews', async () => {
  const fundi = await register('Role Fundi', 'rolefundi@test.com', 'fundi', { trade: 'Plumber' });
  const otherFundi = await register('Other Fundi', 'otherfundi@test.com', 'fundi', { trade: 'Plumber' });
  const client = await register('Role Client', 'roleclient@test.com', 'client');

  const denied = await request(`/api/reviews/${fundi.id}`, {
    method: 'POST', headers: otherFundi.auth, body: { rating: 1 }
  });
  assert.equal(denied.status, 403);

  const allowed = await request(`/api/reviews/${fundi.id}`, {
    method: 'POST', headers: client.auth, body: { rating: 5 }
  });
  assert.equal(allowed.status, 201);
});

test('only clients can create job requests', async () => {
  const fundi = await register('Req Role Fundi', 'reqrolefundi@test.com', 'fundi', { trade: 'Mason' });
  const otherFundi = await register('Req Other Fundi', 'reqotherfundi@test.com', 'fundi', { trade: 'Mason' });

  const { status } = await request('/api/requests', {
    method: 'POST', headers: otherFundi.auth, body: { fundi_id: fundi.id, message: 'Hire me instead' }
  });
  assert.equal(status, 403);
});

test('only the addressed fundi can respond to a job request', async () => {
  const fundi = await register('Resp Fundi', 'respfundi@test.com', 'fundi', { trade: 'Painter' });
  const otherFundi = await register('Resp Other Fundi', 'respotherfundi@test.com', 'fundi', { trade: 'Painter' });
  const client = await register('Resp Client', 'respclient@test.com', 'client');

  const created = await request('/api/requests', {
    method: 'POST', headers: client.auth, body: { fundi_id: fundi.id, message: 'Paint a room' }
  });
  const path = `/api/requests/${created.data.id}/status`;

  const byClient = await request(path, { method: 'PUT', headers: client.auth, body: { status: 'accepted' } });
  assert.equal(byClient.status, 403);

  const byOtherFundi = await request(path, { method: 'PUT', headers: otherFundi.auth, body: { status: 'accepted' } });
  assert.equal(byOtherFundi.status, 403);

  const byFundi = await request(path, { method: 'PUT', headers: fundi.auth, body: { status: 'accepted' } });
  assert.equal(byFundi.status, 200);
  assert.equal(byFundi.data.status, 'accepted');
});

test('only fundis can add proof of work', async () => {
  const fundi = await register('Pow Fundi', 'powfundi@test.com', 'fundi', { trade: 'Tiler' });
  const client = await register('Pow Client', 'powclient@test.com', 'client');
  const body = { media_url: 'https://example.com/job.jpg' };

  const denied = await request('/api/proof-of-work', { method: 'POST', headers: client.auth, body });
  assert.equal(denied.status, 403);

  const allowed = await request('/api/proof-of-work', { method: 'POST', headers: fundi.auth, body });
  assert.equal(allowed.status, 201);
});

test('endorsements can only target fundi profiles', async () => {
  const client = await register('Badge Target Client', 'badgetargetclient@test.com', 'client');
  const endorser = await register('Badge Target Endorser', 'badgetargetendorser@test.com', 'fundi', { trade: 'Welder' });

  const { status } = await request(`/api/badges/${client.id}`, {
    method: 'POST', headers: endorser.auth, body: { badge_name: 'Great Client' }
  });
  assert.equal(status, 404);
});

test('flagged reviews are hidden from profile detail and search ratings, but not from moderation', async () => {
  const fundi = await register('Flag Fundi', 'flagfundi@test.com', 'fundi', { trade: 'Glazier', location: 'Eldoret' });
  const clientA = await register('Flag Client A', 'flagclienta@test.com', 'client');
  const clientB = await register('Flag Client B', 'flagclientb@test.com', 'client');

  await request(`/api/reviews/${fundi.id}`, { method: 'POST', headers: clientA.auth, body: { rating: 5 } });
  const bad = await request(`/api/reviews/${fundi.id}`, { method: 'POST', headers: clientB.auth, body: { rating: 1 } });
  await request(`/api/reviews/${bad.data.id}/flag`, { method: 'POST', headers: clientA.auth });

  const profile = await request(`/api/profiles/${fundi.id}`);
  assert.equal(profile.status, 200);
  assert.ok(!profile.data.reviews.some(r => r.id === bad.data.id));
  assert.equal(profile.data.reviews.length, 1);

  const search = await request('/api/profiles?trade=Glazier');
  const found = search.data.find(f => f.id === fundi.id);
  assert.equal(found.average_rating, 5);
  assert.equal(found.review_count, 1);

  const moderation = await request('/api/reviews/moderation/flagged', {
    headers: { 'x-admin-token': 'test-admin-token' }
  });
  assert.equal(moderation.status, 200);
  assert.ok(moderation.data.some(r => r.id === bad.data.id));
});

test('moderation routes reject a wrong admin token', async () => {
  const { status } = await request('/api/reviews/moderation/flagged', {
    headers: { 'x-admin-token': 'semakazi-local-admin-dev-only' }
  });
  assert.equal(status, 403);
});
