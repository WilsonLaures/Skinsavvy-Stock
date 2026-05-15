// server/migrate.js
// One-time migration tool.
//
// Imports a GlowStock JSON backup (exported from the browser via "Backup DB")
// into the SQLite database so you can switch from localStorage to the server
// without losing any existing data.
//
// Usage:
//   node migrate.js path/to/glowstock_backup_YYYY-MM-DD.json
//
// The script is safe to run multiple times — existing records are updated
// (upsert), not duplicated.

'use strict';

const fs   = require('fs');
const path = require('path');
const db   = require('./db');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node migrate.js <path-to-backup.json>');
  process.exit(1);
}

const resolved = path.resolve(filePath);
if (!fs.existsSync(resolved)) {
  console.error(`File not found: ${resolved}`);
  process.exit(1);
}

let snapshot;
try {
  snapshot = JSON.parse(fs.readFileSync(resolved, 'utf8'));
} catch (e) {
  console.error('Failed to parse JSON file:', e.message);
  process.exit(1);
}

console.log(`\n✦ GlowStock Migration Tool`);
console.log(`─────────────────────────────`);
console.log(`Source: ${resolved}`);
console.log(`Target: ${db.DB_PATH}\n`);

let total = 0;

for (const collection of db.COLLECTIONS) {
  const records = snapshot[collection];
  if (!Array.isArray(records)) {
    console.log(`  SKIP  ${collection.padEnd(14)} (not found in backup)`);
    continue;
  }

  // Assign a stable id to records that don't have one
  // (older backups may be arrays without ids)
  let imported = 0;
  for (const record of records) {
    if (!record.id) {
      // Generate a deterministic id based on position + content
      record.id = collection.slice(0,3).toUpperCase() + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6);
    }
    try {
      db.upsert(collection, record);
      imported++;
    } catch (e) {
      console.warn(`  WARN  Failed to import record in ${collection}:`, e.message);
    }
  }

  console.log(`  OK    ${collection.padEnd(14)} ${imported} record${imported !== 1 ? 's' : ''} imported`);
  total += imported;
}

console.log(`\n  Total: ${total} records imported into SQLite.`);
console.log(`  Done!\n`);
