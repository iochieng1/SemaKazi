Render.com deployment steps for SemaKazi

Backend (Web Service)

- In Render dashboard, create a new **Web Service**.
- Connect your GitHub repo and select branch `main`.
- Set **Root Directory** to `semakazi-backend`.
- Environment: `Node` (Latest LTS).
- Build Command: `npm install --production`
- Start Command: `npm start`
- Add Environment Variables:
  - `NODE_ENV` = `production` (required: turns on the startup checks below and blocks demo seeding)
  - `JWT_SECRET` = (secure random string)
  - `ADMIN_TOKEN` = (secure random string, at least 32 characters, e.g. `openssl rand -hex 32`)
  - `PORT` = `4000` (optional)
  - `DB_PATH` = `/data/semakazi.db`
  - Do not set `SEED_DEMO_DATA`; it is ignored in production anyway.
- With `NODE_ENV=production` the service refuses to start if `JWT_SECRET` or a strong `ADMIN_TOKEN` is missing. Check the deploy logs if it fails to boot.
- Under **Advanced** add a **Persistent Disk** and mount it at `/data` (this ensures SQLite file persists across deploys).
- Configure off-disk backups with the `BACKUP_S3_*` variables before launch, and run the restore drill. See [DATABASE_BACKUPS.md](DATABASE_BACKUPS.md). Without them the service logs a warning that the database is not being backed up.

Notes: SQLite on the persistent disk is the launch database. Managed Postgres remains a later option; see DATABASE_BACKUPS.md.

Frontend (Static Site)

- In Render dashboard, create a new **Static Site**.
- Connect your GitHub repo and select branch `main`.
- **Root Directory**: `semakazi-frontend`
- **Build Command**: `sh build.sh` (this writes `js/env.js` using the `API_URL` env var)
- **Publish Directory**: `semakazi-frontend`
- Add Environment Variable:
  - `API_URL` = `https://<your-backend-host>/api` (the backend service URL)

Workflow summary

- Deploy backend first; note its produced URL (e.g. `https://semakazi-backend.onrender.com`).
- Set the frontend `API_URL` to `<backend-url>/api` and deploy the static site.

Other recommendations

- Use Render Secrets to store `JWT_SECRET` securely.
- Configure CORS in `semakazi-backend` to allow only your frontend origin in production.
- Monitor logs and add health checks (the app exposes `/api/health`).
