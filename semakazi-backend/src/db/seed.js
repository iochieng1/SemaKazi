const bcrypt = require('bcryptjs');
const db = require('./index');

// Demo data uses published, guessable passwords (e.g. password123), so it
// must never become real login identities. Seeding is refused outright in
// production, and server startup only seeds when SEED_DEMO_DATA=true.
function assertNotProduction() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo accounts in production (NODE_ENV=production).');
  }
}

// Exported so both `npm run seed` (manual, CLI) and an opted-in server
// startup can call the same logic safely, any number of times.
function seedIfEmpty() {
  assertNotProduction();

  const { count } = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (count > 0) {
    console.log('Database already has data — skipping seed.');
    return;
  }

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, trade, location, bio, phone)
    VALUES (@name, @email, @password_hash, @role, @trade, @location, @bio, @phone)
  `);

  // Each fundi has their own password (hashed individually below), plus
  // the original core sample accounts used in earlier testing/docs.
  const users = [
    { name: 'Juma Otieno', email: 'juma@example.com', password: 'password123', role: 'fundi', trade: 'Electrician', location: 'Nairobi - Kawangware', bio: '8 years wiring homes and small businesses.', phone: '0711000001' },
    { name: 'Wanjiru Kamau', email: 'wanjiru@example.com', password: 'password123', role: 'fundi', trade: 'Carpenter', location: 'Nairobi - Kibera', bio: 'Custom furniture and repairs.', phone: '0711000002' },
    { name: 'Client Test', email: 'client@example.com', password: 'password123', role: 'client', trade: null, location: 'Nairobi', bio: null, phone: '0711000003' },
    { name: 'David Cheruiyot', email: 'david.cheruiyot@example.com', password: 'Weld@123', role: 'fundi', trade: 'Welder', location: 'Nakuru', bio: 'Structural and gate welding for homes and businesses.', phone: '0711000010' },
    { name: 'Eric Mutiso', email: 'eric.mutiso@example.com', password: 'Roof@123', role: 'fundi', trade: 'Roofer', location: 'Machakos', bio: 'Roofing installation and leak repair.', phone: '0711000011' },
    { name: 'George Kamau', email: 'george.kamau@example.com', password: 'Secure@123', role: 'fundi', trade: 'CCTV Installer', location: 'Thika', bio: 'Home and business security camera installation.', phone: '0711000012' },
    { name: 'Dennis Barasa', email: 'dennis.barasa@example.com', password: 'Tile@123', role: 'fundi', trade: 'Tiler', location: 'Bungoma', bio: 'Floor and wall tiling for residential projects.', phone: '0711000013' },
    { name: 'Victor Wekesa', email: 'victor.wekesa@example.com', password: 'Design@123', role: 'fundi', trade: 'Interior Designer', location: 'Kitale', bio: 'Space planning and interior finishing.', phone: '0711000014' },
    { name: 'Alex Maina', email: 'alex.maina@example.com', password: 'Wood@123', role: 'fundi', trade: 'Furniture Maker', location: 'Nyeri', bio: 'Custom wooden furniture, built to order.', phone: '0711000015' },
    { name: 'Collins Njoroge', email: 'collins.njoroge@example.com', password: 'Solar@123', role: 'fundi', trade: 'Solar Technician', location: 'Naivasha', bio: 'Solar panel installation and maintenance.', phone: '0711000016' },
    { name: 'James Kibet', email: 'james.kibet@example.com', password: 'Cooling@123', role: 'fundi', trade: 'AC Technician', location: 'Kericho', bio: 'Air conditioning installation and servicing.', phone: '0711000017' },
    { name: 'Martin Onyango', email: 'martin.onyango@example.com', password: 'Garage@123', role: 'fundi', trade: 'Mechanic', location: 'Homa Bay', bio: 'General car repair and servicing.', phone: '0711000018' },
    { name: 'Felix Muli', email: 'felix.muli@example.com', password: 'Water@123', role: 'fundi', trade: 'Borehole Technician', location: 'Embu', bio: 'Borehole drilling and water pump repair.', phone: '0711000019' }
  ];

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insertUser.run({
        name: row.name,
        email: row.email,
        password_hash: bcrypt.hashSync(row.password, 10),
        role: row.role,
        trade: row.trade,
        location: row.location,
        bio: row.bio,
        phone: row.phone
      });
    }
  });

  insertMany(users);

  const juma = db.prepare('SELECT id FROM users WHERE email = ?').get('juma@example.com');
  const clientTest = db.prepare('SELECT id, name FROM users WHERE email = ?').get('client@example.com');
  const wanjiru = db.prepare('SELECT id, name FROM users WHERE email = ?').get('wanjiru@example.com');

  db.prepare(`
    INSERT INTO reviews (fundi_id, reviewer_id, reviewer_name, rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `).run(juma.id, clientTest.id, clientTest.name, 5, 'Fixed our wiring fault fast and explained everything.');

  db.prepare(`
    INSERT INTO skill_badges (user_id, badge_name, awarded_by, awarded_by_id)
    VALUES (?, ?, ?, ?)
  `).run(juma.id, 'Certified Wiring Safety', wanjiru.name, wanjiru.id);

  console.log('Seed complete. Sample login: juma@example.com / password123');
}

// Called on every server start. Seeds only on an explicit non-production
// opt-in, so an empty production database stays empty.
function seedOnStartup() {
  if (process.env.NODE_ENV === 'production') return;
  if (process.env.SEED_DEMO_DATA !== 'true') return;
  seedIfEmpty();
}

// Allow running directly via `npm run seed`, while still being importable
// from server.js for the opted-in startup seed.
if (require.main === module) {
  require('dotenv').config();
  seedIfEmpty();
}

module.exports = { seedIfEmpty, seedOnStartup };
