// Single source of truth for auth config. Falls back to a fixed dev secret
// when JWT_SECRET isn't set — so local development never breaks on a
// missing .env — but refuses to start that way in production, where a
// real secret is required.

const isProduction = process.env.NODE_ENV === 'production';
const DEV_FALLBACK_SECRET = 'semakazi-local-dev-only-do-not-use-in-production';

let jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  if (isProduction) {
    throw new Error('JWT_SECRET must be set in production. Refusing to start with no secret.');
  }
  console.warn(
    '\n⚠️  JWT_SECRET not set in .env — using a fixed local development fallback.\n' +
    '   This is fine for local testing, but set a real JWT_SECRET in .env\n' +
    '   (and in your hosting platform\'s env vars) before deploying.\n'
  );
  jwtSecret = DEV_FALLBACK_SECRET;
}

// Shared secret for the moderation routes (review listing and permanent
// deletion). Same pattern as JWT_SECRET, but stricter: the dev fallback is
// published in this repo, so production refuses to start without a real,
// long token rather than silently accepting the public one.
const DEV_FALLBACK_ADMIN_TOKEN = 'semakazi-local-admin-dev-only';
const MIN_ADMIN_TOKEN_LENGTH = 32;

let adminToken = process.env.ADMIN_TOKEN;

if (isProduction) {
  if (!adminToken) {
    throw new Error('ADMIN_TOKEN must be set in production. Refusing to start with no admin token.');
  }
  if (adminToken === DEV_FALLBACK_ADMIN_TOKEN) {
    throw new Error('ADMIN_TOKEN is the public development fallback. Set a private token in production.');
  }
  if (adminToken.length < MIN_ADMIN_TOKEN_LENGTH) {
    throw new Error(`ADMIN_TOKEN must be at least ${MIN_ADMIN_TOKEN_LENGTH} characters in production.`);
  }
} else if (!adminToken) {
  console.warn(
    '\n⚠️  ADMIN_TOKEN not set in .env — using a fixed local development fallback.\n' +
    '   Moderation routes accept it only outside production.\n'
  );
  adminToken = DEV_FALLBACK_ADMIN_TOKEN;
}

module.exports = {
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminToken,
  MIN_ADMIN_TOKEN_LENGTH
};

