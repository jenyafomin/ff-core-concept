// pm2 config for the ff-brain writer service (SPEC R-5, AC-22).
//   npm run build -w @ff/brain && pm2 start packages/brain/ecosystem.brain.config.cjs
//   node packages/brain/dist/bin/ff-brain.js health
// Home = ~/.ff-brain (override with FF_BRAIN_HOME). One instance only: the journal lock refuses a second.
//
// Interpreter is an ABSOLUTE node path (prelaunch critic F3): the live pm2 daemon runs on Node 18, so a bare
// 'node' resolves through the daemon's PATH to v18, while the brain needs Node >=20 (ESM, engines).
// Override with FF_BRAIN_NODE=/abs/path/to/node (must be >=20) in the shell that runs `pm2 start`.
const path = require('node:path');

const DEFAULT_NODE = '/Users/mac16/.nvm/versions/node/v22.23.2/bin/node';

module.exports = {
  apps: [
    {
      name: 'ff-brain',
      script: path.join(__dirname, 'dist/bin/ff-brain-serve.js'),
      cwd: __dirname,
      interpreter: process.env.FF_BRAIN_NODE || DEFAULT_NODE,
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
