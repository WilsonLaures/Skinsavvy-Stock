// server/routes/api.js
// REST API for GlowStock.
//
// Endpoints:
//   GET    /api/health                → server health check
//   GET    /api/snapshot              → full DB dump (used on app load)
//   POST   /api/snapshot              → restore full DB from backup JSON
//   GET    /api/:collection           → get all records
//   POST   /api/:collection           → create / upsert one record
//   PUT    /api/:collection           → replace entire collection (bulk sync)
//   PUT    /api/:collection/:id       → update one record
//   DELETE /api/:collection/:id       → delete one record
//   DELETE /api/:collection           → bulk delete (body: { ids: [] })

'use strict';

const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ── Response helpers ──────────────────────────────────────────────────
const ok  = (res, data)           => res.json({ ok: true, data });
const bad = (res, msg, code = 400) => res.status(code).json({ ok: false, error: msg });

// ── Middleware: ensure collection param is valid ───────────────────────
function validateCollection(req, res, next) {
  const { collection } = req.params;
  if (collection && !db.COLLECTIONS.includes(collection)) {
    return bad(res, `Unknown collection: "${collection}"`, 400);
  }
  next();
}

// ── Full snapshot ─────────────────────────────────────────────────────
router.get('/snapshot', (req, res) => {
  try { ok(res, db.getSnapshot()); }
  catch (e) { bad(res, e.message, 500); }
});

router.post('/snapshot', (req, res) => {
  try {
    const snapshot = req.body;
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return bad(res, 'Expected a JSON object containing collection arrays');
    }
    db.restoreSnapshot(snapshot);
    ok(res, { restored: true });
  } catch (e) { bad(res, e.message, 500); }
});

// ── Collection: GET all ───────────────────────────────────────────────
router.get('/:collection', validateCollection, (req, res) => {
  try { ok(res, db.getAll(req.params.collection)); }
  catch (e) { bad(res, e.message, 500); }
});

// ── Collection: POST (create/upsert one) ─────────────────────────────
router.post('/:collection', validateCollection, (req, res) => {
  try {
    const record = req.body;
    if (!record || !record.id) return bad(res, 'Record must include an "id" field');
    ok(res, db.upsert(req.params.collection, record));
  } catch (e) { bad(res, e.message, 500); }
});

// ── Collection: PUT all (replace entire collection) ───────────────────
router.put('/:collection', validateCollection, (req, res) => {
  try {
    const records = req.body;
    if (!Array.isArray(records)) return bad(res, 'Expected an array of records');
    const count = db.replaceAll(req.params.collection, records);
    ok(res, { replaced: count });
  } catch (e) { bad(res, e.message, 500); }
});

// ── Record: PUT (update one) ──────────────────────────────────────────
router.put('/:collection/:id', validateCollection, (req, res) => {
  try {
    const record = { ...req.body, id: req.params.id };
    ok(res, db.upsert(req.params.collection, record));
  } catch (e) { bad(res, e.message, 500); }
});

// ── Record: DELETE one ────────────────────────────────────────────────
router.delete('/:collection/:id', validateCollection, (req, res) => {
  try {
    const deleted = db.remove(req.params.collection, req.params.id);
    ok(res, { deleted });
  } catch (e) { bad(res, e.message, 500); }
});

// ── Collection: DELETE many (body: { ids: [] }) ───────────────────────
router.delete('/:collection', validateCollection, (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return bad(res, 'Expected { ids: ["id1","id2",...] }');
    const count = db.removeMany(req.params.collection, ids);
    ok(res, { deleted: count });
  } catch (e) { bad(res, e.message, 500); }
});

module.exports = router;
