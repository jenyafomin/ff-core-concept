// pm2 config for the ff-brain writer service (SPEC R-5, AC-22).
//   npm run build -w @ff/brain && pm2 start packages/brain/ecosystem.brain.config.cjs
//   node packages/brain/dist/bin/ff-brain.js health
// Home = ~/.ff-brain (override with FF_BRAIN_HOME). One instance only: the journal lock refuses a second.
const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'ff-brain',
      script: path.join(__dirname, 'dist/bin/ff-brain-serve.js'),
      cwd: __dirname,
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      // SIGTERM → store.close() releases the lock; give the write queue time to drain
      kill_timeout: 8000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
