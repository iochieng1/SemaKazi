require('dotenv').config();
const createApp = require('./app');
const seedIfEmpty = require('./db/seed');

// Auto-seeds on startup if the database is empty — matters on hosting
// platforms with ephemeral disks (e.g. Render free tier), where the
// SQLite file gets wiped on every restart/redeploy.
seedIfEmpty();

const app = createApp();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log(`SemaKazi API running on port ${PORT}`));