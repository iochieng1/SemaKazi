const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/requests — a logged-in client sends a job request to a fundi.
// Lightweight alternative to a full booking/calendar system: just a
// formal, in-platform way to say "I want to hire you," instead of only
// having a phone number to go on.
router.post('/', requireAuth, (req, res) => {
  const { fundi_id, message, preferred_date } = req.body;

  if (!fundi_id || !message) {
    return res.status(400).json({ error: 'fundi_id and message are required' });
  }
  if (Number(fundi_id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot send a request to yourself' });
  }

  const fundi = db.prepare('SELECT id FROM users WHERE id = ? AND role = \'fundi\'').get(fundi_id);
  if (!fundi) return res.status(404).json({ error: 'Fundi not found' });

  const result = db.prepare(`
    INSERT INTO job_requests (fundi_id, client_id, message, preferred_date)
    VALUES (?, ?, ?, ?)
  `).run(fundi_id, req.user.id, message, preferred_date || null);

  const request = db.prepare('SELECT * FROM job_requests WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(request);
});

// GET /api/requests/incoming — logged-in fundi's own inbox: requests sent
// to them by clients.
router.get('/incoming', requireAuth, (req, res) => {
  const requests = db.prepare(`
    SELECT jr.*, u.name as client_name, u.phone as client_phone
    FROM job_requests jr
    JOIN users u ON u.id = jr.client_id
    WHERE jr.fundi_id = ?
    ORDER BY jr.created_at DESC
  `).all(req.user.id);
  res.json(requests);
});

// PUT /api/requests/:id/status — the fundi who received a request can
// accept or decline it.
router.put('/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;
  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'status must be accepted or declined' });
  }

  const request = db.prepare('SELECT * FROM job_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.fundi_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only respond to requests sent to you' });
  }

  db.prepare('UPDATE job_requests SET status = ? WHERE id = ?').run(status, req.params.id);
  const updated = db.prepare('SELECT * FROM job_requests WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;