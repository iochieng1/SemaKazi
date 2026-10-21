const crypto = require('crypto');
const { adminToken } = require('../config');

const expected = Buffer.from(adminToken);

// Simple shared-secret check for moderation routes. Not a full role
// system — just enough to gate the flag/delete endpoints from public
// access. Send the token in an `x-admin-token` header. Compared in
// constant time so response timing doesn't leak the token.
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  const given = Buffer.from(typeof token === 'string' ? token : '');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = requireAdmin;
