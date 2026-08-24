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

-- Reviews: left by a logged-in client after a job. reviewer_id ties every
-- review to a real account (closes the "anyone can type any name" gap).
-- flagged lets any logged-in user report a review for moderator review.
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fundi_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  flagged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Skill badges: peer/community endorsements of a specific trade skill.
-- A given endorser can only award the same badge name to the same fundi once.
CREATE TABLE IF NOT EXISTS skill_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  awarded_by TEXT NOT NULL,
  awarded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, badge_name, awarded_by_id)
);

-- Job requests: lightweight "request this fundi" contact flow. Not a full
-- booking/calendar system — just a way for a client to formally reach out
-- through the platform instead of only via the phone number on a profile.
CREATE TABLE IF NOT EXISTS job_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fundi_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  preferred_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_trade_location ON users(trade, location);
CREATE INDEX IF NOT EXISTS idx_reviews_fundi ON reviews(fundi_id);
CREATE INDEX IF NOT EXISTS idx_proof_user ON proof_of_work(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_user ON skill_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_fundi ON job_requests(fundi_id);
CREATE INDEX IF NOT EXISTS idx_requests_client ON job_requests(client_id);
