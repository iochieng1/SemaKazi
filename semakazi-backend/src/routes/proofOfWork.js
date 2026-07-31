const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/proof-of-work — logged-in fundi adds a media entry
// Note: this stores a media_url string. Actual file upload to Cloudinary/S3
// is a Phase 2 (frontend/media) concern — this endpoint just persists the result.
router.post('/', requireAuth, (req, res) => {
  const { media_url, caption } = req.body;
  if (!media_url) return res.status(400).json({ error: 'media_url is required' });

  const result = db.prepare(`
    INSERT INTO proof_of_work (user_id, media_url, caption)
    VALUES (?, ?, ?)
  `).run(req.user.id, media_url, caption || null);

  const entry = db.prepare('SELECT * FROM proof_of_work WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(entry);
});

// GET /api/proof-of-work/:userId — public, so clients can view a fundi's portfolio
router.get('/:userId', (req, res) => {
  const entries = db.prepare(
    'SELECT * FROM proof_of_work WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.params.userId);
  res.json(entries);
});

// DELETE /api/proof-of-work/:id — only the owner can remove their own entry
router.delete('/:id', requireAuth, (req, res) => {
  const entry = db.prepare('SELECT * FROM proof_of_work WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  if (entry.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own entries' });
  }
  db.prepare('DELETE FROM proof_of_work WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;