// Command-line entry point for database backups. See docs/DATABASE_BACKUPS.md.
//
//   npm run db:backup                              take a backup now
//   npm run db:backups                             list backups, oldest first
//   npm run db:restore -- <name|latest> <target>   restore into a new file
//   npm run db:verify-backup                       restore the latest backup to
//                                                  a temp file and check it

require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  storageFromEnv, listBackups, backupDatabase, restoreDatabase, inspect
} = require('./backup');

async function resolveName(storage, name) {
  if (name !== 'latest') return name;
  const names = await listBackups(storage);
  if (!names.length) throw new Error(`No backups found in ${storage.description}`);
  return names[names.length - 1];
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const storage = storageFromEnv();
  if (!storage) {
    throw new Error('No backup storage configured. Set BACKUP_S3_BUCKET (or BACKUP_DIR for local testing).');
  }

  switch (command) {
    case 'backup': {
      const db = require('./index');
      const result = await backupDatabase(db, storage);
      console.log(`Uploaded ${result.name} (${result.bytes} bytes) to ${storage.description}`);
      console.log('Row counts:', result.counts);
      break;
    }
    case 'list': {
      for (const name of await listBackups(storage)) console.log(name);
      break;
    }
    case 'restore': {
      const force = args.includes('--force');
      const [name, target] = args.filter((a) => a !== '--force');
      if (!name || !target) throw new Error('Usage: restore <name|latest> <target-path> [--force]');
      const result = await restoreDatabase(storage, await resolveName(storage, name), path.resolve(target), { force });
      console.log(`Restored ${result.name} to ${result.targetPath}`);
      console.log('Row counts:', result.counts);
      break;
    }
    case 'verify': {
      const name = await resolveName(storage, 'latest');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'semakazi-verify-'));
      try {
        const result = await restoreDatabase(storage, name, path.join(tmpDir, 'restored.db'));
        console.log(`Latest backup ${name} restores cleanly and passes the integrity check.`);
        console.log('Restored row counts:', result.counts);
        const livePath = process.env.DB_PATH || './data/semakazi.db';
        if (fs.existsSync(livePath)) {
          console.log('Current database row counts:', inspect(livePath));
        }
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
      break;
    }
    default:
      throw new Error('Usage: node src/db/backupCli.js <backup|list|restore|verify>');
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
