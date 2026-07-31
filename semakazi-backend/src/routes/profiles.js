const express = require('express');
const db = require('../db');
const { requireAuth, requireSelf } = require('../middleware/auth');

const router = express.Router();

const PUBLIC_FIELDS = 'id, name, role, trade, location, bio, phone, created_at';

// GET /api/profiles?trade=Electrician&location=Nairobi
router.get('/', (req, res) => {
  const { trade, location } = req.query;

  let query = `SELECT ${PUBLIC_FIELDS} FROM users WHERE role = 'fundi'`;
  const params = [];

  if (trade) {
    query += ' AND trade LIKE ?';
    params.push(`%${trade}%`);
  }
  if (location) {
    query += ' AND location LIKE ?';
    params.push(`%${location}%`);
  }
  query += ' ORDER BY created_at DESC';

  const fundis = db.prepare(query).all(...params);

  // Attach average rating for each fundi so search results show trust signal up front
  const withRatings = fundis.map((f) => {
    const { avg, count } = db.prepare(
      'SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE fundi_id = ?'
    ).get(f.id);
    return { ...f, average_rating: avg ? Number(avg.toFixed(1)) : null, review_count: count };
  });

  res.json(withRatings);
});

// GET /api/profiles/:id — full profile with proof of work, reviews, badges
router.get('/:id', (req, res) => {
  const user = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Profile not found' });

  const proofOfWork = db.prepare('SELECT * FROM proof_of_work WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
  const reviews = db.prepare('SELECT * FROM reviews WHERE fundi_id = ? ORDER BY created_at DESC').all(user.id);
  const badges = db.prepare('SELECT * FROM skill_badges WHERE user_id = ? ORDER BY created_at DESC').all(user.id);

  res.json({ ...user, proof_of_work: proofOfWork, reviews, badges });
});

// PUT /api/profiles/:id — only the logged-in owner can edit their own profile
router.put('/:id', requireAuth, requireSelf('id'), (req, res) => {
  const { trade, location, bio, phone } = req.body;

  db.prepare(`
    UPDATE users SET
      trade = COALESCE(?, trade),
      location = COALESCE(?, location),
      bio = COALESCE(?, bio),
      phone = COALESCE(?, phone)
    WHERE id = ?
  `).run(trade, location, bio, phone, req.params.id);

  const updated = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`).get(req.params.id);
  res.json(updated);
});

module.exports = router;