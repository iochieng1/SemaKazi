require('dotenv').config();
const createApp = require('./app');
const { seedOnStartup } = require('./db/seed');

// Demo data only when SEED_DEMO_DATA=true outside production — useful for
// a local or throwaway demo instance whose disk is wiped on redeploy.
seedOnStartup();

const app = createApp();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log(`SemaKazi API running on port ${PORT}`));