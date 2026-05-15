// server/server.js
// GlowStock — Express server.
// Serves frontend static files AND REST API.
// Run with:  node server.js          (production)
//            node --watch server.js  (development auto-reload)

'use strict';

const express = require('express');
const path    = require('path');
const cors    = require('cors');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS: allow any origin in dev, restrict via ALLOWED_ORIGIN env var in production
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));

// Request logger (concise)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`${new Date().toISOString().slice(11,19)} ${req.method} ${req.path}`);
  }
  next();
});

// ── Health check ──────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: '1.0.0', timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────────────
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// ── Serve frontend ────────────────────────────────────────────────────
const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR, {
  // Don't cache HTML so the app always gets the latest index.html
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ── Global error handler ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────
const dbPath = require('./db').DB_PATH;
app.listen(PORT, () => {
  console.log(`
  ✦ GlowStock is running
  ────────────────────────────────────
  App:      http://localhost:${PORT}
  API:      http://localhost:${PORT}/api
  Database: ${dbPath}
  ────────────────────────────────────
  Press Ctrl+C to stop
  `);
});
