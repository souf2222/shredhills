require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const punchRoutes = require('./routes/punch');
const meRoutes    = require('./routes/me');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
  },
}));

// Static kiosk UI
app.use(express.static(path.join(__dirname, '..', 'public')));

// Pretty URL for the employee self-service page
app.get('/me', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'me', 'index.html'));
});

// Routes
app.use('/api/punch', punchRoutes);
app.use('/api/me', meRoutes);
app.use('/admin', adminRoutes);

// Healthcheck
app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Shredhills Timeclock running at http://localhost:${PORT}`);
});
