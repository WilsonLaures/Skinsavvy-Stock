// server/db.js
// SQLite database layer — better-sqlite3 (synchronous).
//
// Design: each collection is one table.
// Each row stores the full object as a JSON blob in the `data` column,
// plus a few extracted columns for indexed queries.
// This mirrors the frontend's in-memory data shape exactly,
// so adding new fields requires no migration.

'use strict';

const Database = require('better-sqlite3');
const path     = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'glowstock.db');
const dbConn  = new Database(DB_PATH);

// Performance tuning
dbConn.pragma('journal_mode = WAL');  // allows concurrent reads
dbConn.pragma('synchronous = NORMAL');
dbConn.pragma('foreign_keys = ON');
dbConn.pragma('cache_size = -32000'); // 32 MB page cache

// ── Collections ───────────────────────────────────────────────────────
const COLLECTIONS = [
  'products', 'sales', 'purchases', 'fees',
  'suppliers', 'categories', 'returns',
  'targets', 'restockRules', 'bundles',
  'brands', 'cashflow',
];

// ── Schema ────────────────────────────────────────────────────────────
dbConn.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id         TEXT PRIMARY KEY,
    sku        TEXT NOT NULL,
    name       TEXT NOT NULL,
    category   TEXT,
    brand      TEXT,
    stock      INTEGER DEFAULT 0,
    data       TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_products_sku      ON products(sku);
  CREATE INDEX IF NOT EXISTS idx_products_name     ON products(name);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_products_brand    ON products(brand);

  CREATE TABLE IF NOT EXISTS sales (
    id         TEXT PRIMARY KEY,
    date       TEXT NOT NULL,
    customer   TEXT,
    data       TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sales_date     ON sales(date);
  CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer);

  CREATE TABLE IF NOT EXISTS purchases (
    id         TEXT PRIMARY KEY,
    date       TEXT NOT NULL,
    supplier   TEXT,
    status     TEXT NOT NULL DEFAULT 'pending',
    data       TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_purchases_date     ON purchases(date);
  CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier);
  CREATE INDEX IF NOT EXISTS idx_purchases_status   ON purchases(status);

  CREATE TABLE IF NOT EXISTS fees (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    type       TEXT,
    data       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id     TEXT PRIMARY KEY,
    name   TEXT NOT NULL,
    parent TEXT,
    data   TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent);

  CREATE TABLE IF NOT EXISTS returns (
    id         TEXT PRIMARY KEY,
    date       TEXT NOT NULL,
    sku        TEXT,
    customer   TEXT,
    data       TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_returns_date ON returns(date);
  CREATE INDEX IF NOT EXISTS idx_returns_sku  ON returns(sku);

  CREATE TABLE IF NOT EXISTS targets (
    id    TEXT PRIMARY KEY,
    month INTEGER NOT NULL,
    year  INTEGER NOT NULL,
    data  TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_targets_month_year ON targets(month, year);

  CREATE TABLE IF NOT EXISTS restockRules (
    id   TEXT PRIMARY KEY,
    sku  TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_restock_sku ON restockRules(sku);

  CREATE TABLE IF NOT EXISTS bundles (
    id   TEXT PRIMARY KEY,
    sku  TEXT NOT NULL,
    name TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_bundles_sku ON bundles(sku);

  CREATE TABLE IF NOT EXISTS brands (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cashflow (
    id         TEXT PRIMARY KEY,
    date       TEXT NOT NULL,
    type       TEXT NOT NULL,
    category   TEXT,
    data       TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_cashflow_date     ON cashflow(date);
  CREATE INDEX IF NOT EXISTS idx_cashflow_type     ON cashflow(type);
  CREATE INDEX IF NOT EXISTS idx_cashflow_category ON cashflow(category);

  -- App settings / metadata
  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// ── Helpers ───────────────────────────────────────────────────────────
function validateCollection(name) {
  if (!COLLECTIONS.includes(name)) {
    throw new Error(`Invalid collection: "${name}". Valid collections: ${COLLECTIONS.join(', ')}`);
  }
}

// Read all rows ordered by insertion order
function getAll(collection) {
  validateCollection(collection);
  const rows = dbConn.prepare(
    `SELECT data FROM ${collection} ORDER BY rowid ASC`
  ).all();
  return rows.map(r => JSON.parse(r.data));
}

// Get one record by id
function getOne(collection, id) {
  validateCollection(collection);
  const row = dbConn.prepare(`SELECT data FROM ${collection} WHERE id = ?`).get(id);
  return row ? JSON.parse(row.data) : null;
}

// Upsert — insert or replace by primary key
function upsert(collection, obj) {
  validateCollection(collection);
  if (!obj || !obj.id) throw new Error(`Record must have an "id" field (collection: ${collection})`);

  const data = JSON.stringify(obj);

  const stmts = {
    products:     () => dbConn.prepare(`INSERT OR REPLACE INTO products(id,sku,name,category,brand,stock,data) VALUES(?,?,?,?,?,?,?)`)
                           .run(obj.id, obj.sku||'', obj.name||'', obj.category||'', obj.brand||'', obj.stock||0, data),
    sales:        () => dbConn.prepare(`INSERT OR REPLACE INTO sales(id,date,customer,data) VALUES(?,?,?,?)`)
                           .run(obj.id, obj.date||'', obj.customer||'', data),
    purchases:    () => dbConn.prepare(`INSERT OR REPLACE INTO purchases(id,date,supplier,status,data) VALUES(?,?,?,?,?)`)
                           .run(obj.id, obj.date||'', obj.supplier||'', obj.status||'pending', data),
    fees:         () => dbConn.prepare(`INSERT OR REPLACE INTO fees(id,name,type,data) VALUES(?,?,?,?)`)
                           .run(obj.id, obj.name||'', obj.type||'', data),
    suppliers:    () => dbConn.prepare(`INSERT OR REPLACE INTO suppliers(id,name,data) VALUES(?,?,?)`)
                           .run(obj.id, obj.name||'', data),
    categories:   () => dbConn.prepare(`INSERT OR REPLACE INTO categories(id,name,parent,data) VALUES(?,?,?,?)`)
                           .run(obj.id, obj.name||'', obj.parent||'', data),
    returns:      () => dbConn.prepare(`INSERT OR REPLACE INTO returns(id,date,sku,customer,data) VALUES(?,?,?,?,?)`)
                           .run(obj.id, obj.date||'', obj.sku||'', obj.customer||'', data),
    targets:      () => dbConn.prepare(`INSERT OR REPLACE INTO targets(id,month,year,data) VALUES(?,?,?,?)`)
                           .run(obj.id, parseInt(obj.month)||0, parseInt(obj.year)||0, data),
    restockRules: () => dbConn.prepare(`INSERT OR REPLACE INTO restockRules(id,sku,data) VALUES(?,?,?)`)
                           .run(obj.id, obj.sku||'', data),
    bundles:      () => dbConn.prepare(`INSERT OR REPLACE INTO bundles(id,sku,name,data) VALUES(?,?,?,?)`)
                           .run(obj.id, obj.sku||'', obj.name||'', data),
    brands:       () => dbConn.prepare(`INSERT OR REPLACE INTO brands(id,name,data) VALUES(?,?,?)`)
                           .run(obj.id, obj.name||'', data),
    cashflow:     () => dbConn.prepare(`INSERT OR REPLACE INTO cashflow(id,date,type,category,data) VALUES(?,?,?,?,?)`)
                           .run(obj.id, obj.date||'', obj.type||'', obj.category||'', data),
  };

  stmts[collection]();
  return obj;
}

// Delete one record by id
function remove(collection, id) {
  validateCollection(collection);
  const result = dbConn.prepare(`DELETE FROM ${collection} WHERE id = ?`).run(id);
  return result.changes > 0;
}

// Bulk delete by ids
function removeMany(collection, ids) {
  validateCollection(collection);
  const del = dbConn.transaction(() => {
    let count = 0;
    for (const id of ids) {
      count += dbConn.prepare(`DELETE FROM ${collection} WHERE id = ?`).run(id).changes;
    }
    return count;
  });
  return del();
}

// Replace entire collection in one transaction
function replaceAll(collection, records) {
  validateCollection(collection);
  const doReplace = dbConn.transaction(() => {
    dbConn.prepare(`DELETE FROM ${collection}`).run();
    for (const r of records) upsert(collection, r);
  });
  doReplace();
  return records.length;
}

// Full snapshot of all collections
function getSnapshot() {
  const snapshot = {};
  for (const c of COLLECTIONS) {
    snapshot[c] = getAll(c);
  }
  return snapshot;
}

// Restore from a full snapshot
function restoreSnapshot(snapshot) {
  const doRestore = dbConn.transaction(() => {
    for (const c of COLLECTIONS) {
      if (Array.isArray(snapshot[c])) replaceAll(c, snapshot[c]);
    }
  });
  doRestore();
}

// Settings helpers
function getSetting(key) {
  const row = dbConn.prepare(`SELECT value FROM settings WHERE key = ?`).get(key);
  return row ? row.value : null;
}
function setSetting(key, value) {
  dbConn.prepare(`INSERT OR REPLACE INTO settings(key,value,updated_at) VALUES(?,?,datetime('now'))`)
    .run(key, String(value));
}

module.exports = {
  DB_PATH,
  COLLECTIONS,
  getAll,
  getOne,
  upsert,
  remove,
  removeMany,
  replaceAll,
  getSnapshot,
  restoreSnapshot,
  getSetting,
  setSetting,
  raw: dbConn,
};
