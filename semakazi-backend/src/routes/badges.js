const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/badges/:userId — any logged-in user can endorse a fundi's skill,
// but the same person can't endorse the same badge on the same fundi twice
// (enforced by a UNIQUE constraint on user_id + badge_name + awarded_by_id
// in the schema) — closes the "spam the same badge" gap from earlier.
router.post('/:userId', requireAuth, (req, res) => {
  const { badge_name } = req.body;
  if (!badge_name) return res.status(400).json({ error: 'badge_name is required' });
  if (Number(req.params.userId) === req.user.id) {
    return res.status(400).json({ error: 'You cannot endorse yourself' });
  }

  const fundi = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
  if (!fundi) return res.status(404).json({ error: 'User not found' });

  const endorser = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);

  try {
    const result = db.prepare(`
      INSERT INTO skill_badges (user_id, badge_name, awarded_by, awarded_by_id)
      VALUES (?, ?, ?, ?)
    `).run(req.params.userId, badge_name, endorser.name, req.user.id);

    const badge = db.prepare('SELECT * FROM skill_badges WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(badge);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'You have already endorsed this fundi for this skill' });
    }
    throw err;
  }
});

// GET /api/badges/:userId — returns badges grouped with an endorsement
// count per badge name, so the frontend can show "Wiring Safety (3)"
// instead of one line per individual endorsement.
router.get('/:userId', (req, res) => {
  const badges = db.prepare(`
    SELECT badge_name, COUNT(*) as endorsement_count, MAX(created_at) as last_endorsed
    FROM skill_badges
    WHERE user_id = ?
    GROUP BY badge_name
    ORDER BY endorsement_count DESC
  `).all(req.params.userId);
  res.json(badges);
});

module.exports = router;