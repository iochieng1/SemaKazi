-- Users: both fundis (workers) and clients share this table, distinguished by role
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('fundi', 'client')) DEFAULT 'fundi',
  trade TEXT,
  location TEXT,
  bio TEXT,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Proof of work: media evidence a fundi uploads to demonstrate real completed jobs
CREATE TABLE IF NOT EXISTS proof_of_work (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  caption TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Reviews: left by clients after a job, drives the trust/reputation score
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fundi_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Skill badges: peer/community endorsements of a specific trade skill
CREATE TABLE IF NOT EXISTS skill_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  awarded_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_trade_location ON users(trade, location);
CREATE INDEX IF NOT EXISTS idx_reviews_fundi ON reviews(fundi_id);
CREATE INDEX IF NOT EXISTS idx_proof_user ON proof_of_work(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_user ON skill_badges(user_id);