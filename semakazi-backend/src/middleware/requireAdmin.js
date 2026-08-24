const { adminToken } = require('../config');

// Simple shared-secret check for moderation routes. Not a full role
// system — just enough to gate the flag/delete endpoints from public
// access. Send the token in an `x-admin-token` header.
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== adminToken) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = requireAdmin;