const path = require('path');
const dotenv = require('dotenv');
const createApp = require('./app');

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

if (!process.env.JWT_SECRET) {
  console.error('Missing required environment variable JWT_SECRET. Create semakazi-backend/.env from .env.example.');
  process.exit(1);
}

const app = createApp();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log(`SemaKazi API running on port ${PORT}`));