# SemaKazi Backend

This is the Express backend for SemaKazi. It uses SQLite and JWT authentication.

## Setup

1. Install dependencies:

```bash
cd semakazi-backend
npm install
```

2. Create a `.env` file in `semakazi-backend` using `.env.example` as a template.

3. Add a strong secret to `.env`:

```env
JWT_SECRET=your-long-random-secret
ADMIN_TOKEN=your-long-random-admin-token
JWT_EXPIRES_IN=7d
PORT=4000
DB_PATH=./data/semakazi.db
```

4. Start the server from the backend folder:

```bash
cd semakazi-backend
npm start
```

## Demo data

The database starts empty. To load sample fundis and a client account (published passwords such as `juma@example.com` / `password123`), either run:

```bash
npm run seed
```

or set `SEED_DEMO_DATA=true` to seed on startup whenever the database is empty. Both are refused when `NODE_ENV=production`, so demo accounts can never become real logins.

## Production requirements

With `NODE_ENV=production` the server refuses to start unless:

- `JWT_SECRET` is set.
- `ADMIN_TOKEN` is set, is not the development fallback, and is at least 32 characters (`openssl rand -hex 32`).

Outside production, both fall back to fixed local-only values with a warning.

## Account roles

| Action | Allowed roles |
| --- | --- |
| Leave a review, send a job request, list your sent requests (`GET /api/requests/outgoing`) | `client` |
| Add proof of work, list requests sent to you (`GET /api/requests/incoming`), accept or decline them | `fundi` |
| Endorse a skill | any logged-in user, on a `fundi` profile |

Other roles get `403`. Flagged reviews are hidden from profiles, search ratings and `GET /api/reviews/:fundiId` until an admin deletes them; `GET /api/reviews/moderation/flagged` still lists them.

## Backups

Production backups go to S3-compatible storage every 6 hours. `npm run db:backup`, `db:backups`, `db:restore` and `db:verify-backup` manage them. See [docs/DATABASE_BACKUPS.md](../docs/DATABASE_BACKUPS.md) for setup, the restore procedure and the pre-launch restore drill.

## Tests

```bash
npm test
```

Use Node 20, the version in the `Dockerfile`. better-sqlite3 11 doesn't support Node 24.

## Why this matters

The backend reads environment variables from `semakazi-backend/.env` at startup. If `JWT_SECRET` is missing, token creation and authorization fail, which can cause internal server errors during registration, login, and profile updates.
