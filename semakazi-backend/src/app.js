const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const proofOfWorkRoutes = require('./routes/proofOfWork');
const reviewRoutes = require('./routes/reviews');
const badgeRoutes = require('./routes/badges');

// Builds and returns a configured Express app, without starting a server.
// Kept separate from server.js so tests can import this directly and spin
// up an ephemeral instance instead of binding to a fixed port.
function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/profiles', profileRoutes);
  app.use('/api/proof-of-work', proofOfWorkRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/badges', badgeRoutes);

  app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = createApp;