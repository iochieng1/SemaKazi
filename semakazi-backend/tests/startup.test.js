// Startup safety checks. Config and the database are loaded once per
// process, so each scenario runs in its own child process with its own
// environment and throwaway SQLite file.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const BACKEND_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(__dirname, '.test-data-startup');
const STRONG_ADMIN_TOKEN = 'a'.repeat(40);

let dbCounter = 0;
function freshDbPath() {
  return path.join(DATA_DIR, `startup-${Date.now()}-${dbCounter++}.db`);
}

// Runs a snippet of Node in the backend directory with only the given env
// (plus PATH), so a developer's own .env or shell variables can't leak in.
function run(script, env) {
  return spawnSync(process.execPath, ['-e', script], {
    cwd: BACKEND_DIR,
    env: { PATH: process.env.PATH, ...env },
    encoding: 'utf8'
  });
}

function countUsers(dbPath) {
  const Database = require('better-sqlite3');
  const db = new Database(dbPath, { readonly: true });
  const { count } = db.prepare('SELECT COUNT(*) as count FROM users').get();
  db.close();
  return count;
}

const START = "require('./src/db/seed').seedOnStartup()";
const LOAD_CONFIG = "require('./src/config')";

test.before(() => fs.mkdirSync(DATA_DIR, { recursive: true }));
test.after(() => fs.rmSync(DATA_DIR, { recursive: true, force: true }));

test('production startup leaves an empty database unseeded, even with SEED_DEMO_DATA=true', () => {
  const dbPath = freshDbPath();
  const result = run(START, {
    NODE_ENV: 'production', DB_PATH: dbPath, SEED_DEMO_DATA: 'true',
    JWT_SECRET: 'x', ADMIN_TOKEN: STRONG_ADMIN_TOKEN
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(countUsers(dbPath), 0);
});

test('npm run seed refuses to run in production', () => {
  const dbPath = freshDbPath();
  const result = spawnSync(process.execPath, ['src/db/seed.js'], {
    cwd: BACKEND_DIR,
    env: { PATH: process.env.PATH, NODE_ENV: 'production', DB_PATH: dbPath },
    encoding: 'utf8'
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing to seed demo accounts in production/);
  assert.equal(countUsers(dbPath), 0);
});

test('development startup does not seed unless SEED_DEMO_DATA=true', () => {
  const dbPath = freshDbPath();
  const result = run(START, { NODE_ENV: 'development', DB_PATH: dbPath });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(countUsers(dbPath), 0);
});

test('development startup seeds demo data when opted in, and only once', () => {
  const dbPath = freshDbPath();
  const env = { NODE_ENV: 'development', DB_PATH: dbPath, SEED_DEMO_DATA: 'true' };

  const first = run(START, env);
  assert.equal(first.status, 0, first.stderr);
  const seeded = countUsers(dbPath);
  assert.ok(seeded > 0);

  const second = run(START, env);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(countUsers(dbPath), seeded);
});

test('production refuses to start without ADMIN_TOKEN', () => {
  const result = run(LOAD_CONFIG, { NODE_ENV: 'production', JWT_SECRET: 'x' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ADMIN_TOKEN must be set in production/);
});

test('production refuses the public development admin token', () => {
  const result = run(LOAD_CONFIG, {
    NODE_ENV: 'production', JWT_SECRET: 'x', ADMIN_TOKEN: 'semakazi-local-admin-dev-only'
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /public development fallback/);
});

test('production refuses a short admin token', () => {
  const result = run(LOAD_CONFIG, { NODE_ENV: 'production', JWT_SECRET: 'x', ADMIN_TOKEN: 'short' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /at least 32 characters/);
});

test('production starts with a strong admin token', () => {
  const result = run(LOAD_CONFIG, { NODE_ENV: 'production', JWT_SECRET: 'x', ADMIN_TOKEN: STRONG_ADMIN_TOKEN });
  assert.equal(result.status, 0, result.stderr);
});

test('development falls back to the local admin token', () => {
  const result = run(`process.stdout.write(${LOAD_CONFIG}.adminToken)`, { NODE_ENV: 'development' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'semakazi-local-admin-dev-only');
});
