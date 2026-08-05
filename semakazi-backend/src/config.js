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

module.exports = {
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d'
};
