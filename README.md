# ✦ GlowStock — Beauty Inventory Manager

A full-featured inventory, sales, and purchasing system for Shopee beauty stores.  
Built with vanilla JS + Express + SQLite. No cloud dependency, runs on your own machine or server.

---

## What's inside

```
glowstock/
├── index.html              ← frontend entry point
├── css/styles.css
├── js/
│   ├── db.js               ← data layer (auto-detects API vs localStorage)
│   ├── app.js              ← bootstrap + shared utilities
│   ├── ui.js               ← navigation, modals, sidebar
│   ├── charts.js           ← Chart.js wrappers
│   ├── utils.js            ← helpers, product selector modal
│   └── modules/            ← one file per page
│       ├── dashboard.js
│       ├── inventory.js
│       ├── sales.js
│       ├── purchases.js
│       ├── returns.js
│       ├── fees.js
│       ├── suppliers.js
│       ├── categories.js
│       ├── brands.js
│       ├── bundles.js
│       ├── targets.js
│       ├── restock.js
│       ├── cashflow.js
│       └── pl.js
├── data/
│   └── defaultCategories.js  ← seed data
└── server/
    ├── server.js             ← Express app
    ├── db.js                 ← SQLite layer (better-sqlite3)
    ├── routes/api.js         ← REST API
    ├── migrate.js            ← one-time localStorage → SQLite import tool
    ├── ecosystem.config.js   ← PM2 production config
    ├── package.json
    └── .env.example
```

---

## Quick start (Mac / Linux)

### Option A — With server + database (recommended)

1. **Install Node.js 18+**
   ```bash
   node --version   # must be ≥ 18
   ```
   If not installed: https://nodejs.org

2. **Install dependencies**
   ```bash
   cd glowstock/server
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open the app**
   ```
   http://localhost:3000
   ```

   Your data is now saved in `server/glowstock.db` — a single SQLite file.

---

### Option B — Without a server (localStorage only)

If you just want to run the frontend without Node.js:

```bash
cd glowstock
python3 -m http.server 8080
```

Open `http://localhost:8080` — data saves in your browser's localStorage.  
> ⚠️ localStorage is browser-specific and clears if you clear browser data. Use Option A for anything serious.

---

## Migrating existing data (localStorage → SQLite)

If you've been using the app without a server, you can move all your data to SQLite in one step.

**Step 1** — Export your data from the browser:  
Click **Backup DB** in the sidebar → saves `glowstock_backup_YYYY-MM-DD.json`

**Step 2** — Run the migration tool:
```bash
cd glowstock/server
npm install          # if not done yet
node migrate.js ~/Downloads/glowstock_backup_2025-01-15.json
```

**Step 3** — Start the server and verify:
```bash
npm start
# Open http://localhost:3000
```

All your products, sales, purchases, and settings will be there.

---

## Keeping the server running (production)

Use PM2 to run GlowStock as a background service that survives reboots.

```bash
# Install PM2 globally (one time)
npm install -g pm2

# Start GlowStock
cd glowstock/server
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs glowstock

# Make it start on system reboot (run this and follow the instructions it prints)
pm2 startup
pm2 save
```

---

## Configuration

Copy `.env.example` to `.env` and edit:

```bash
cp server/.env.example server/.env
```

| Variable         | Default              | Description                                    |
|------------------|----------------------|------------------------------------------------|
| `PORT`           | `3000`               | Port the server listens on                     |
| `DB_PATH`        | `server/glowstock.db`| Absolute path to the SQLite file               |
| `ALLOWED_ORIGIN` | `*`                  | Restrict CORS to your domain in production     |

To load the `.env` file, start the server like this:
```bash
# Bash (Mac/Linux)
export $(cat .env | xargs) && node server.js

# Or use cross-env / dotenv-cli if you prefer
npx dotenv -e .env -- node server.js
```

---

## Deploying to a VPS (Ubuntu)

```bash
# 1. Copy your glowstock folder to the server
scp -r glowstock user@your-server:/home/user/

# 2. SSH in and install Node.js
ssh user@your-server
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install dependencies
cd /home/user/glowstock/server
npm install --production

# 4. Set up PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup    # follow the printed command
pm2 save

# 5. (Optional) Reverse proxy with nginx
# Point your domain to port 3000, or use:
sudo apt install nginx
# Edit /etc/nginx/sites-available/glowstock with:
#   location / { proxy_pass http://localhost:3000; }
```

---

## Deploying to Railway (one-click cloud)

Railway can run your Node.js server for free (500 hours/month on the free tier).

1. Push to a **private** GitHub repository
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Select your repo
4. Set environment variables in Railway dashboard:
   - `PORT` = `3000`
   - `DB_PATH` = `/data/glowstock.db`  (persistent volume)
5. Add a Volume mount at `/data`
6. Railway auto-detects Node.js and runs `npm start`

---

## Deploying to Render

1. Push to GitHub
2. New Web Service → Connect repo
3. Root directory: `glowstock/server`
4. Build command: `npm install`
5. Start command: `node server.js`
6. Add environment variable: `PORT=10000`
7. Add a Persistent Disk at `/data` and set `DB_PATH=/data/glowstock.db`

---

## API reference

All endpoints return `{ ok: true, data: ... }` on success or `{ ok: false, error: "..." }` on failure.

| Method   | Path                        | Description                             |
|----------|-----------------------------|-----------------------------------------|
| `GET`    | `/api/health`               | Health check                            |
| `GET`    | `/api/snapshot`             | Full database dump (all collections)    |
| `POST`   | `/api/snapshot`             | Restore from full backup                |
| `GET`    | `/api/:collection`          | Get all records in a collection         |
| `POST`   | `/api/:collection`          | Create / upsert one record              |
| `PUT`    | `/api/:collection`          | Replace entire collection (bulk sync)   |
| `PUT`    | `/api/:collection/:id`      | Update one record                       |
| `DELETE` | `/api/:collection/:id`      | Delete one record                       |
| `DELETE` | `/api/:collection`          | Bulk delete (`{ ids: [...] }` in body)  |

Valid collection names: `products`, `sales`, `purchases`, `fees`, `suppliers`, `categories`, `returns`, `targets`, `restockRules`, `bundles`, `brands`, `cashflow`

---

## Backup & recovery

### Manual backup (browser)
Click **Backup DB** in the sidebar → downloads `glowstock_backup_YYYY-MM-DD.json`

### Manual backup (server)
```bash
# Copy the SQLite file (safe even while the server is running, thanks to WAL mode)
cp server/glowstock.db server/glowstock_backup_$(date +%Y-%m-%d).db
```

### Scheduled backup (cron)
```bash
crontab -e
# Add this line to back up every day at 2 AM:
0 2 * * * cp /home/user/glowstock/server/glowstock.db /home/user/backups/glowstock_$(date +\%Y-\%m-\%d).db
```

### Restore from .json backup
```bash
node server/migrate.js path/to/glowstock_backup.json
```

### Restore from .db backup
```bash
# Stop the server first
pm2 stop glowstock
cp path/to/glowstock_backup.db server/glowstock.db
pm2 start glowstock
```

---

## Troubleshooting

**Port 3000 is already in use**
```bash
PORT=3001 node server.js
# then open http://localhost:3001
```

**`better-sqlite3` build error on install**
```bash
npm install --build-from-source
# Or install build tools:
# macOS: xcode-select --install
# Ubuntu: sudo apt install build-essential python3
```

**Data not saving when using file://**  
The app falls back to localStorage when opened as a file. Run `python3 -m http.server 8080` or start the Node.js server instead.

**How to reset all data**
```bash
# Delete the database and restart (creates a fresh one)
rm server/glowstock.db
npm start
```

---

## Tech stack

| Layer     | Technology          |
|-----------|---------------------|
| Frontend  | Vanilla JS, HTML, CSS (no framework) |
| Charts    | Chart.js 4          |
| Icons     | Tabler Icons        |
| Backend   | Node.js + Express 4 |
| Database  | SQLite via better-sqlite3 |
| Process   | PM2 (production)    |
# Skinsavvy-Stock
