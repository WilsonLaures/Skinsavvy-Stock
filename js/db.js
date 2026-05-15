// js/db.js
// Data layer for GlowStock.
//
// MODE DETECTION (automatic):
//   • If the page is served from localhost or a real server (http/https),
//     all reads and writes go to the REST API → data lives in SQLite.
//   • If the page is opened as a local file (file:// protocol),
//     falls back to localStorage so the app still works without a server.
//
// You never need to change this file. Just run the server and it works.

// ── Collections ───────────────────────────────────────────────────────
const DB_KEYS = [
  'products', 'sales', 'purchases', 'fees',
  'suppliers', 'categories', 'returns',
  'targets', 'restockRules', 'bundles',
  'brands', 'cashflow',
];

// ── In-memory state ───────────────────────────────────────────────────
const db = {
  products:     [],
  sales:        [],
  purchases:    [],
  fees:         [],
  suppliers:    [],
  categories:   [],
  returns:      [],
  targets:      [],
  restockRules: [],
  bundles:      [],
  brands:       [],
  cashflow:     [],
};

// ── Mode detection ────────────────────────────────────────────────────
const _USE_API = window.location.protocol !== 'file:';
const _API_BASE = '/api';

// Show a small indicator in the page title
function _setStorageMode() {
  if (_USE_API) {
    document.title = 'GlowStock ✦';
    console.info('[db] Mode: API (SQLite server)');
  } else {
    document.title = 'GlowStock ✦ [offline]';
    console.info('[db] Mode: localStorage (no server detected)');
  }
}

// ── API helpers ───────────────────────────────────────────────────────
async function _apiFetch(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(_API_BASE + path, opts);
  const json = await res.json();

  if (!json.ok) throw new Error(json.error || `API error ${res.status}`);
  return json.data;
}

// ── Public interface ──────────────────────────────────────────────────

/**
 * Load all data on app start.
 * API mode: one GET /api/snapshot call.
 * Fallback: read each key from localStorage.
 */
async function dbLoad() {
  _setStorageMode();

  if (_USE_API) {
    try {
      const snapshot = await _apiFetch('GET', '/snapshot');
      DB_KEYS.forEach(key => {
        if (Array.isArray(snapshot[key])) db[key] = snapshot[key];
      });
      console.info('[db] Loaded from server:', DB_KEYS.map(k => `${k}(${db[k].length})`).join(' '));
    } catch (e) {
      console.error('[db] Failed to load from server — using localStorage fallback.', e);
      _loadFromLocalStorage();
    }
  } else {
    _loadFromLocalStorage();
  }

  // Seed default categories on first run
  if (!db.categories.length) {
    db.categories = DEFAULT_CATEGORIES.map((c, i) => ({
      ...c,
      id: 'CAT-' + String(i).padStart(3, '0'),
    }));
    await dbPersist();
  }
}

function _loadFromLocalStorage() {
  DB_KEYS.forEach(key => {
    try {
      const raw = localStorage.getItem('gs_' + key);
      if (raw) db[key] = JSON.parse(raw);
    } catch (e) {
      console.warn('[db] localStorage read error:', key, e);
    }
  });
}

/**
 * Persist all collections.
 * API mode: PUT /api/:collection for each collection.
 * Fallback: write each key to localStorage.
 *
 * Called after every write operation in the app.
 */
async function dbPersist() {
  if (_USE_API) {
    try {
      // Send all collections in parallel
      await Promise.all(
        DB_KEYS.map(key => _apiFetch('PUT', '/' + key, db[key]))
      );
    } catch (e) {
      console.error('[db] Failed to persist to server — saving to localStorage as backup.', e);
      _saveToLocalStorage();
    }
  } else {
    _saveToLocalStorage();
  }
}

function _saveToLocalStorage() {
  DB_KEYS.forEach(key => {
    try {
      localStorage.setItem('gs_' + key, JSON.stringify(db[key]));
    } catch (e) {
      console.warn('[db] localStorage write error:', key, e);
    }
  });
}

/**
 * Export a full JSON backup — always from the in-memory state.
 */
function dbExport() {
  const snapshot = {};
  DB_KEYS.forEach(key => snapshot[key] = db[key]);
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'glowstock_backup_' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  uiToast('Backup downloaded');
}

/**
 * Restore from a JSON backup file.
 * API mode: POST /api/snapshot.
 * Fallback: write directly to localStorage.
 */
function dbImport(file) {
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const snapshot = JSON.parse(e.target.result);

      if (_USE_API) {
        await _apiFetch('POST', '/snapshot', snapshot);
      }

      // Always update in-memory state
      DB_KEYS.forEach(key => {
        if (Array.isArray(snapshot[key])) db[key] = snapshot[key];
      });

      if (!_USE_API) _saveToLocalStorage();

      appRenderAll();
      uiToast('Database restored successfully');
    } catch (err) {
      alert('Could not restore backup: ' + err.message);
      console.error('[db] Import error:', err);
    }
  };
  reader.readAsText(file);
}

// ── Ensure every record has an id before saving ───────────────────────
// Some older code paths push plain objects without ids.
// This patches them transparently.
const _origPersist = dbPersist;
async function dbPersistSafe() {
  DB_KEYS.forEach(key => {
    db[key].forEach((rec, i) => {
      if (!rec.id) {
        rec.id = key.slice(0,3).toUpperCase() + '-' + Date.now().toString(36) + i;
      }
    });
  });
  return _origPersist();
}
// Override with safe version
// (can't use const reassignment, so we replace at runtime via the global)
window.dbPersist = dbPersistSafe;
