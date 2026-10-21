require('dotenv').config();
const createApp = require('./app');
const { seedOnStartup } = require('./db/seed');
const db = require('./db');
const { storageFromEnv, scheduleBackups } = require('./db/backup');

// Demo data only when SEED_DEMO_DATA=true outside production — useful for
// a local or throwaway demo instance whose disk is wiped on redeploy.
seedOnStartup();

// Off-disk database backups. See docs/DATABASE_BACKUPS.md.
const backupStorage = storageFromEnv();
if (backupStorage) {
  const hours = Number(process.env.BACKUP_INTERVAL_HOURS) || 6;
  scheduleBackups(db, backupStorage, hours);
  console.log(`Database backups every ${hours}h to ${backupStorage.description}`);
} else if (process.env.NODE_ENV === 'production') {
  console.warn('⚠️  No backup storage configured (BACKUP_S3_BUCKET). The database is not being backed up.');
}

const app = createApp();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log(`SemaKazi API running on port ${PORT}`));