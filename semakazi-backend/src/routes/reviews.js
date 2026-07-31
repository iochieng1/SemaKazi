const express = require('express');
const db = require('../db');

const router = express.Router();

// POST /api/reviews/:fundiId — left by a client. Kept open (no auth) for the
// MVP since clients are often one-off and not registered users; revisit if
// spam/fake reviews become a problem (e.g. require a phone-verified session).
router.post('/:fundiId', (req, res) => {
  const { reviewer_name, rating, comment } = req.body;
  const { fundiId } = req.params;

  if (!reviewer_name || !rating) {
    return res.status(400).json({ error: 'reviewer_name and rating are required' });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be between 1 and 5' });
  }

  const fundi = db.prepare('SELECT id FROM users WHERE id = ? AND role = \'fundi\'').get(fundiId);
  if (!fundi) return res.status(404).json({ error: 'Fundi not found' });

  const result = db.prepare(`
    INSERT INTO reviews (fundi_id, reviewer_name, rating, comment)
    VALUES (?, ?, ?, ?)
  `).run(fundiId, reviewer_name, rating, comment || null);

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(review);
});

// GET /api/reviews/:fundiId
router.get('/:fundiId', (req, res) => {
  const reviews = db.prepare(
    'SELECT * FROM reviews WHERE fundi_id = ? ORDER BY created_at DESC'
  ).all(req.params.fundiId);
  res.json(reviews);
});

module.exports = router;