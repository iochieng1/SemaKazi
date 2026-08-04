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
JWT_EXPIRES_IN=7d
PORT=4000
DB_PATH=./data/semakazi.db
```

4. Start the server from the backend folder:

```bash
cd semakazi-backend
npm start
```

## Why this matters

The backend reads environment variables from `semakazi-backend/.env` at startup. If `JWT_SECRET` is missing, token creation and authorization fail, which can cause internal server errors during registration, login, and profile updates.
