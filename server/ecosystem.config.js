// ecosystem.config.js
// PM2 process manager config.
// Use this to keep GlowStock running in production and auto-restart on crash.
//
// Install PM2:  npm install -g pm2
// Start:        pm2 start ecosystem.config.js
// Status:       pm2 status
// Logs:         pm2 logs glowstock
// Stop:         pm2 stop glowstock
// Auto-start on reboot: pm2 startup  (follow the printed instructions)

module.exports = {
  apps: [
    {
      name:        'glowstock',
      script:      './server.js',
      cwd:         __dirname,
      instances:   1,              // single instance (SQLite doesn't support multiple writers)
      autorestart: true,
      watch:       false,          // set true only in dev
      max_memory_restart: '256M',

      env: {
        NODE_ENV: 'production',
        PORT:     3000,
        // DB_PATH: '/var/data/glowstock.db',   // optional: custom DB location
        // ALLOWED_ORIGIN: 'https://yourdomain.com',  // optional: restrict CORS
      },
    },
  ],
};
