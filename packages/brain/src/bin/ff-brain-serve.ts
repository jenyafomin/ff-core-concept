#!/usr/bin/env node
// ff-brain-serve — the brain writer service (SPEC R-5). Run under pm2 (ecosystem.brain.config.cjs) or by hand:
//   FF_BRAIN_HOME=/tmp/x node packages/brain/dist/bin/ff-brain-serve.js
// Home: FF_BRAIN_HOME or ~/.ff-brain. Socket: FF_BRAIN_SOCKET or <home>/brain.sock. A second instance exits 1
// with a readable lock message; SIGTERM/SIGINT close the server and release the journal lock.
import { BRAIN_ENV } from '../contract.js';
import { resolveHome } from '../service/paths.js';
import { startBrain, type RunningBrain } from '../service/server.js';

const log = (line: string): void => {
  process.stderr.write(`[ff-brain] ${new Date().toISOString()} ${line}\n`);
};

async function main(): Promise<void> {
  const home = resolveHome(process.env);
  let running: RunningBrain;
  try {
    running = await startBrain({
      home,
      log,
      ...(process.env[BRAIN_ENV.socket] ? { socketPath: process.env[BRAIN_ENV.socket]! } : {}),
    });
  } catch (e) {
    log(`failed to start: ${(e as Error).message}`);
    process.exit(1);
  }
  const h = await running.service.health();
  log(`listening on ${running.socketPath} (home ${home}; acts ${h.acts}, records ${h.records}, bad_lines ${h.bad_lines})`);
  process.stdout.write(`ff-brain ready ${running.socketPath}\n`);

  let stopping = false;
  const stop = (signal: string) => {
    if (stopping) return;
    stopping = true;
    log(`${signal}: stopping`);
    const hard = setTimeout(() => {
      running.service.closeSync();
      process.exit(0);
    }, 5000);
    hard.unref();
    running
      .stop()
      .catch((e) => log(`stop failed: ${(e as Error).message}`))
      .finally(() => {
        running.service.closeSync();
        process.exit(0);
      });
  };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
}

void main();
