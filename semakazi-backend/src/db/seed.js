const bcrypt = require('bcryptjs');
const db = require('./index');

// Exported so both `npm run seed` (manual, CLI) and server startup
// (automatic, for platforms with ephemeral disks like Render's free tier)
// can call the same logic safely, any number of times.
function seedIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (count > 0) {
    console.log('Database already has data — skipping seed.');
    return;
  }

  const passwordHash = bcrypt.hashSync('password123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, trade, location, bio, phone)
    VALUES (@name, @email, @password_hash, @role, @trade, @location, @bio, @phone)
  `);

  const users = [
    { name: 'Juma Otieno', email: 'juma@example.com', password_hash: passwordHash, role: 'fundi', trade: 'Electrician', location: 'Nairobi - Kawangware', bio: '8 years wiring homes and small businesses.', phone: '0711000001' },
    { name: 'Wanjiru Kamau', email: 'wanjiru@example.com', password_hash: passwordHash, role: 'fundi', trade: 'Carpenter', location: 'Nairobi - Kibera', bio: 'Custom furniture and repairs.', phone: '0711000002' },
    { name: 'Client Test', email: 'client@example.com', password_hash: passwordHash, role: 'client', trade: null, location: 'Nairobi', bio: null, phone: '0711000003' }
  ];

  const insertMany = db.transaction((rows) => {
    for (const row of rows) insertUser.run(row);
  });

  insertMany(users);

  const juma = db.prepare('SELECT id FROM users WHERE email = ?').get('juma@example.com');

  db.prepare(`
    INSERT INTO reviews (fundi_id, reviewer_name, rating, comment)
    VALUES (?, ?, ?, ?)
  `).run(juma.id, 'Peter M.', 5, 'Fixed our wiring fault fast and explained everything.');

  db.prepare(`
    INSERT INTO skill_badges (user_id, badge_name, awarded_by)
    VALUES (?, ?, ?)
  `).run(juma.id, 'Certified Wiring Safety', 'SemaKazi Community Review');

  console.log('Seed complete. Sample login: juma@example.com / password123');
}

// Allow running directly via `npm run seed`, while still being importable
// as a function from server.js for auto-seeding on startup.
if (require.main === module) {
  require('dotenv').config();
  seedIfEmpty();
}

module.exports = seedIfEmpty;