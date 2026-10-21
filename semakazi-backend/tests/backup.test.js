// Backup and restore round trip against a local backup folder (BACKUP_DIR
// storage), using a throwaway database with the real schema.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const Database = require('better-sqlite3');
const {
  storageFromEnv, listBackups, backupDatabase, restoreDatabase
} = require('../src/db/backup');

const WORK_DIR = path.join(__dirname, '.test-data-backup');
const BACKUP_DIR = path.join(WORK_DIR, 'backups');
const SOURCE_PATH = path.join(WORK_DIR, 'source.db');
const storage = storageFromEnv({ BACKUP_DIR });

let source;

test.before(() => {
  fs.rmSync(WORK_DIR, { recursive: true, force: true });
  fs.mkdirSync(WORK_DIR, { recursive: true });
  source = new Database(SOURCE_PATH);
  source.pragma('journal_mode = WAL');
  source.exec(fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'schema.sql'), 'utf8'));
  const insert = source.prepare(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, 'hash', ?)"
  );
  insert.run('Backup Fundi', 'backupfundi@test.com', 'fundi');
  insert.run('Backup Client', 'backupclient@test.com', 'client');
  source.prepare(
    "INSERT INTO reviews (fundi_id, reviewer_id, reviewer_name, rating) VALUES (1, 2, 'Backup Client', 5)"
  ).run();
});

test.after(() => {
  source.close();
  fs.rmSync(WORK_DIR, { recursive: true, force: true });
});

test('no storage is configured without BACKUP_S3_BUCKET or BACKUP_DIR', () => {
  assert.equal(storageFromEnv({}), null);
});

test('a backup restores into a clean path with the same data', async () => {
  const backup = await backupDatabase(source, storage, new Date('2026-01-01T00:00:00Z'));
  assert.deepEqual(await listBackups(storage), [backup.name]);
  assert.equal(backup.counts.users, 2);

  const target = path.join(WORK_DIR, 'clean-env', 'restored.db');
  const restored = await restoreDatabase(storage, backup.name, target);
  assert.deepEqual(restored.counts, backup.counts);

  const db = new Database(target, { readonly: true });
  const emails = db.prepare('SELECT email FROM users ORDER BY id').all().map((u) => u.email);
  db.close();
  assert.deepEqual(emails, ['backupfundi@test.com', 'backupclient@test.com']);
});

test('restore refuses to overwrite an existing database without force', async () => {
  const [name] = await listBackups(storage);
  await assert.rejects(restoreDatabase(storage, name, SOURCE_PATH), /already exists/);
});

test('backups list oldest first, so the newest is last', async () => {
  source.prepare(
    "INSERT INTO users (name, email, password_hash, role) VALUES ('Later', 'later@test.com', 'hash', 'client')"
  ).run();
  const newer = await backupDatabase(source, storage, new Date('2026-01-02T00:00:00Z'));
  const names = await listBackups(storage);
  assert.equal(names[names.length - 1], newer.name);
  assert.equal(newer.counts.users, 3);
});

test('a corrupted backup is rejected and leaves no file behind', async () => {
  const name = 'semakazi-2026-01-03T00-00-00-000Z.db.gz';
  await storage.put(name, require('node:zlib').gzipSync(Buffer.from('not a sqlite database')));
  const target = path.join(WORK_DIR, 'corrupt', 'restored.db');
  await assert.rejects(restoreDatabase(storage, name, target));
  assert.equal(fs.existsSync(target), false);
  assert.equal(fs.existsSync(`${target}.restoring`), false);
});

test('db:verify-backup CLI restores the latest backup and reports row counts', () => {
  fs.rmSync(path.join(BACKUP_DIR, 'semakazi-2026-01-03T00-00-00-000Z.db.gz'));
  const result = spawnSync(process.execPath, ['src/db/backupCli.js', 'verify'], {
    cwd: path.join(__dirname, '..'),
    env: { PATH: process.env.PATH, BACKUP_DIR, DB_PATH: SOURCE_PATH },
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /restores cleanly and passes the integrity check/);
  assert.match(result.stdout, /users: 3/);
});
