const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Only lets a logged-in user act on their own resource (e.g. edit own profile)
function requireSelf(paramName = 'id') {
  return (req, res, next) => {
    const targetId = Number(req.params[paramName]);
    if (req.user.id !== targetId) {
      return res.status(403).json({ error: 'You can only modify your own resource' });
    }
    next();
  };
}

module.exports = { requireAuth, requireSelf };