const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// GET /api/reviews/moderation/flagged — admin only. Must be declared before
// the /:fundiId route below, or Express would match "moderation" as a
// fundiId and this would never be reached.
router.get('/moderation/flagged', requireAdmin, (req, res) => {
  const flagged = db.prepare(
    'SELECT * FROM reviews WHERE flagged = 1 ORDER BY created_at DESC'
  ).all();
  res.json(flagged);
});

// POST /api/reviews/:fundiId — requires login. Ties every review to a real
// account instead of an arbitrary typed name, closing the "anyone can claim
// to be anyone" gap. Doesn't yet confirm an actual hire happened — that's
// still a known limitation, documented in the README.
router.post('/:fundiId', requireAuth, (req, res) => {
  const { rating, comment } = req.body;
  const { fundiId } = req.params;

  if (!rating) {
    return res.status(400).json({ error: 'rating is required' });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be between 1 and 5' });
  }
  if (Number(fundiId) === req.user.id) {
    return res.status(400).json({ error: 'You cannot review yourself' });
  }

  const fundi = db.prepare('SELECT id FROM users WHERE id = ? AND role = \'fundi\'').get(fundiId);
  if (!fundi) return res.status(404).json({ error: 'Fundi not found' });

  const reviewer = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);

  const result = db.prepare(`
    INSERT INTO reviews (fundi_id, reviewer_id, reviewer_name, rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `).run(fundiId, req.user.id, reviewer.name, rating, comment || null);

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(review);
});

// GET /api/reviews/:fundiId — public. Flagged reviews are hidden from
// this normal view; they still exist in the database for admin review.
router.get('/:fundiId', (req, res) => {
  const reviews = db.prepare(
    'SELECT * FROM reviews WHERE fundi_id = ? AND flagged = 0 ORDER BY created_at DESC'
  ).all(req.params.fundiId);
  res.json(reviews);
});

// POST /api/reviews/:id/flag — any logged-in user can report a review.
// Sets flagged = 1, which hides it from the public GET above until an
// admin reviews it. Doesn't delete anything — moderation, not censorship.
router.post('/:id/flag', requireAuth, (req, res) => {
  const review = db.prepare('SELECT id FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });

  db.prepare('UPDATE reviews SET flagged = 1 WHERE id = ?').run(req.params.id);
  res.json({ id: Number(req.params.id), flagged: true });
});

// DELETE /api/reviews/:id — admin only. Permanently removes a review,
// typically after reviewing something that was flagged.
router.delete('/:id', requireAdmin, (req, res) => {
  const review = db.prepare('SELECT id FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });

  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
