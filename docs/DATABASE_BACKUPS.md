# Database backups and restore

## Production database

SemaKazi launches on **SQLite** stored on a Render persistent disk mounted at `/data` (`DB_PATH=/data/semakazi.db`). It holds account credentials (bcrypt hashes), reviews, badges and job requests.

The persistent disk survives redeploys and restarts. It does not protect against losing the disk, a bad migration, or an accidental `DELETE`. That is what these backups are for.

Moving to managed Postgres remains the longer-term option. It would replace this process with the provider's point-in-time recovery, but it means migrating every query off better-sqlite3, so it is out of scope for launch.

## Backup policy

| | |
| --- | --- |
| What | A consistent online snapshot of the whole database (`db.backup()`), integrity-checked, gzipped |
| Where | S3-compatible object storage outside Render: AWS S3, Cloudflare R2 or Backblaze B2 |
| How often | Every 6 hours (`BACKUP_INTERVAL_HOURS`), plus one a minute after each deploy |
| Retention | 30 days, enforced by a bucket lifecycle rule (not by the app) |
| Worst-case data loss | About 6 hours |

The API takes backups itself because a Render cron job cannot mount the web service's disk. A failed backup is logged as `Database backup failed:` and never takes the API down. Each success logs `Database backup uploaded: <name>`.

Render also takes its own daily disk snapshots, which you can restore from the dashboard. Treat them as a second layer: they live on the same platform, and their retention is set by Render. Check Render's current documentation for details.

## One-time setup

1. Create a private bucket, for example `semakazi-backups`. Turn on versioning if the provider offers it.
2. Add a lifecycle rule that deletes objects under `semakazi-db/` after 30 days.
3. Create an access key limited to that bucket, with `PutObject`, `GetObject` and `ListBucket` only.
4. In the Render backend service, set these environment variables:

   | Variable | Example |
   | --- | --- |
   | `BACKUP_S3_BUCKET` | `semakazi-backups` |
   | `BACKUP_S3_ACCESS_KEY_ID` / `BACKUP_S3_SECRET_ACCESS_KEY` | the key from step 3 |
   | `BACKUP_S3_REGION` | `auto` for R2, or the bucket region, e.g. `eu-west-1` |
   | `BACKUP_S3_ENDPOINT` | R2: `https://<account-id>.r2.cloudflarestorage.com`; B2: `https://s3.<region>.backblazeb2.com`; leave unset for AWS |
   | `BACKUP_S3_PREFIX` | optional, default `semakazi-db/` |
   | `BACKUP_INTERVAL_HOURS` | optional, default `6` |

5. Redeploy. Within about a minute the log should show `Database backup uploaded: semakazi-<timestamp>.db.gz`. If it shows `No backup storage configured`, the variables are missing.

## Commands

Run these from `semakazi-backend`. In production, use the Render service **Shell**.

```bash
npm run db:backup                                  # take a backup now
npm run db:backups                                 # list backups, oldest first
npm run db:verify-backup                           # restore the latest to a temp file and check it
npm run db:restore -- latest /data/semakazi.restored.db
npm run db:restore -- semakazi-2026-10-21T06-00-00-000Z.db.gz /data/semakazi.restored.db
```

Every restore runs SQLite's `integrity_check` and prints the row count of each table. `restore` refuses to overwrite an existing file unless you pass `--force`.

## Restore procedure (production)

The running service never has its database file replaced underneath it. Instead, restore to a new file and switch `DB_PATH`:

1. Open the backend service **Shell** on Render.
2. `npm run db:backups` and choose the backup, normally the newest one taken before the incident.
3. `npm run db:restore -- <name> /data/semakazi.restored-<date>.db`, then check the printed row counts.
4. In **Environment**, set `DB_PATH=/data/semakazi.restored-<date>.db` and save. Render redeploys onto the restored file.
5. Check `/api/health`, log in with a known account, and open a profile with reviews.
6. Keep the old file until you are sure, then delete it from the shell.

Anything written after the chosen backup is lost. Take a fresh `npm run db:backup` of the damaged database first if any of it might be worth recovering by hand.

## Restore drill: before launch, then quarterly

Prove a restore works in a clean environment, not just that uploads succeed:

1. On your machine, or in a fresh Render service with its own empty disk, check out the deployed commit and run `npm ci`.
2. Set only the `BACKUP_S3_*` variables, pointing at the production bucket with a read-only key if possible.
3. Run `npm run db:restore -- latest ./drill/semakazi.db`.
4. Run the API against it with `DB_PATH=./drill/semakazi.db NODE_ENV=production JWT_SECRET=<any> ADMIN_TOKEN=<32+ chars> npm start`, then check that search, a profile and its reviews load.
5. Compare the row counts with `npm run db:verify-backup` run in production.
6. Record the date, backup name, row counts and how long it took in the table below, then delete `./drill`: it contains real user data.

| Date | Backup | Row counts match | Time to restore | By |
| --- | --- | --- | --- | --- |
| _not yet run_ | | | | |

`npm test` also runs an automated backup → restore → verify round trip (`tests/backup.test.js`) against a local folder.
