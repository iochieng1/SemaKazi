Render.com deployment steps for SemaKazi

Backend (Web Service)

- In Render dashboard, create a new **Web Service**.
- Connect your GitHub repo and select branch `main`.
- Set **Root Directory** to `semakazi-backend`.
- Environment: `Node` (Latest LTS).
- Build Command: `npm install --production`
- Start Command: `npm start`
- Add Environment Variables:
  - `JWT_SECRET` = (secure random string)
  - `PORT` = `4000` (optional)
  - `DB_PATH` = `/data/semakazi.db`
- Under **Advanced** add a **Persistent Disk** and mount it at `/data` (this ensures SQLite file persists across deploys).

Notes: If you prefer a managed DB (recommended for production), provision a Postgres database on Render and migrate the app from SQLite to Postgres.

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
