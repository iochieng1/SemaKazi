require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const proofOfWorkRoutes = require('./routes/proofOfWork');
const reviewRoutes = require('./routes/reviews');
const badgeRoutes = require('./routes/badges');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/proof-of-work', proofOfWorkRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/badges', badgeRoutes);

// Fallback 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`SemaKazi API running on port ${PORT}`));