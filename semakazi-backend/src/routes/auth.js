const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { jwtSecret, jwtExpiresIn } = require('../config');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
}

router.post('/register', (req, res) => {
  const { name, email, password, role, trade, location, bio, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  if (role && !['fundi', 'client'].includes(role)) {
    return res.status(400).json({ error: 'role must be fundi or client' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const password_hash = bcrypt.hashSync(password, 10);

  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, trade, location, bio, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, email, password_hash, role || 'fundi', trade || null, location || null, bio || null, phone || null);

  const user = db.prepare('SELECT id, name, email, role, trade, location FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = signToken(user);

  res.status(201).json({ user, token });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user);
  const { password_hash, ...safeUser } = user;

  res.json({ user: safeUser, token });
});

module.exports = router;