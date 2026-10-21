const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const Database = require('better-sqlite3');

// Database backups to storage outside the application disk. A Render
// persistent disk survives redeploys, but not disk loss or an accidental
// DELETE, so snapshots are copied to S3-compatible object storage
// (AWS S3, Cloudflare R2, Backblaze B2). BACKUP_DIR stores them in a local
// folder instead, for local testing only.

const KEY_PREFIX = 'semakazi-';
const KEY_SUFFIX = '.db.gz';
const TABLES = ['users', 'proof_of_work', 'reviews', 'skill_badges', 'job_requests'];

function s3Storage(env) {
  const {
    S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command
  } = require('@aws-sdk/client-s3');

  const bucket = env.BACKUP_S3_BUCKET;
  const prefix = env.BACKUP_S3_PREFIX || 'semakazi-db/';
  const client = new S3Client({
    region: env.BACKUP_S3_REGION || 'auto',
    endpoint: env.BACKUP_S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(env.BACKUP_S3_ENDPOINT),
    credentials: env.BACKUP_S3_ACCESS_KEY_ID
      ? { accessKeyId: env.BACKUP_S3_ACCESS_KEY_ID, secretAccessKey: env.BACKUP_S3_SECRET_ACCESS_KEY }
      : undefined
  });

  return {
    description: `s3://${bucket}/${prefix}`,
    async put(name, body) {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: prefix + name, Body: body }));
    },
    async get(name) {
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: prefix + name }));
      return Buffer.from(await res.Body.transformToByteArray());
    },
    async list() {
      const names = [];
      let ContinuationToken;
      do {
        const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken }));
        for (const obj of res.Contents || []) names.push(obj.Key.slice(prefix.length));
        ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
      } while (ContinuationToken);
      return names;
    }
  };
}

function directoryStorage(dir) {
  return {
    description: dir,
    async put(name, body) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, name), body);
    },
    async get(name) {
      return fs.readFileSync(path.join(dir, name));
    },
    async list() {
      return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    }
  };
}

// Returns the configured backup storage, or null when backups are off.
function storageFromEnv(env = process.env) {
  if (env.BACKUP_S3_BUCKET) return s3Storage(env);
  if (env.BACKUP_DIR) return directoryStorage(env.BACKUP_DIR);
  return null;
}

// Timestamped names sort chronologically, so the newest backup is last.
function backupName(now) {
  return `${KEY_PREFIX}${now.toISOString().replace(/[:.]/g, '-')}${KEY_SUFFIX}`;
}

async function listBackups(storage) {
  const names = await storage.list();
  return names.filter((n) => n.startsWith(KEY_PREFIX) && n.endsWith(KEY_SUFFIX)).sort();
}

// Opens a SQLite file read-only, confirms it is intact, and returns the
// row count of each table so a restore can be compared with production.
function inspect(dbPath) {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const integrity = db.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') throw new Error(`Integrity check failed for ${dbPath}: ${integrity}`);
    const counts = {};
    for (const table of TABLES) {
      counts[table] = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
    }
    return counts;
  } finally {
    db.close();
  }
}

// Takes a consistent online snapshot (safe while the API is serving
// requests), verifies it, compresses it and uploads it.
async function backupDatabase(db, storage, now = new Date()) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'semakazi-backup-'));
  const snapshot = path.join(tmpDir, 'snapshot.db');
  try {
    await db.backup(snapshot);
    const counts = inspect(snapshot);
    const body = zlib.gzipSync(fs.readFileSync(snapshot));
    const name = backupName(now);
    await storage.put(name, body);
    return { name, bytes: body.length, counts };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Downloads a backup into targetPath and verifies it. Never overwrites an
// existing file unless force is set: the usual restore writes a new file
// and points DB_PATH at it, so the live database is never touched.
async function restoreDatabase(storage, name, targetPath, { force = false } = {}) {
  if (fs.existsSync(targetPath) && !force) {
    throw new Error(`${targetPath} already exists. Restore to a new path, or pass --force.`);
  }
  const body = zlib.gunzipSync(await storage.get(name));
  const partial = `${targetPath}.restoring`;
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(partial, body);
  try {
    const counts = inspect(partial);
    for (const suffix of ['-wal', '-shm']) fs.rmSync(targetPath + suffix, { force: true });
    fs.renameSync(partial, targetPath);
    return { name, targetPath, counts };
  } catch (err) {
    fs.rmSync(partial, { force: true });
    throw err;
  }
}

// Runs a backup every intervalHours, plus one shortly after startup so a
// fresh deploy is covered straight away. Failures are logged, not thrown,
// so a storage outage never takes the API down.
function scheduleBackups(db, storage, intervalHours) {
  const run = async () => {
    try {
      const { name, bytes } = await backupDatabase(db, storage);
      console.log(`Database backup uploaded: ${name} (${bytes} bytes) to ${storage.description}`);
    } catch (err) {
      console.error('Database backup failed:', err);
    }
  };
  setTimeout(run, 60 * 1000).unref();
  setInterval(run, intervalHours * 60 * 60 * 1000).unref();
}

module.exports = {
  storageFromEnv,
  listBackups,
  backupDatabase,
  restoreDatabase,
  scheduleBackups,
  inspect
};
