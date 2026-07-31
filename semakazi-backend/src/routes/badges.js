const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/badges/:userId — any logged-in user can endorse a fundi's skill.
// Simple MVP rule: one badge of a given name per (endorser, fundi) pair would
// need an extra column to enforce properly — noted here as a known v2 gap.
router.post('/:userId', requireAuth, (req, res) => {
  const { badge_name } = req.body;
  if (!badge_name) return res.status(400).json({ error: 'badge_name is required' });

  const fundi = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
  if (!fundi) return res.status(404).json({ error: 'User not found' });

  const result = db.prepare(`
    INSERT INTO skill_badges (user_id, badge_name, awarded_by)
    VALUES (?, ?, ?)
  `).run(req.params.userId, badge_name, req.user.email);

  const badge = db.prepare('SELECT * FROM skill_badges WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(badge);
});

// GET /api/badges/:userId
router.get('/:userId', (req, res) => {
  const badges = db.prepare(
    'SELECT * FROM skill_badges WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.params.userId);
  res.json(badges);
});

module.exports = router;