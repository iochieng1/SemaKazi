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