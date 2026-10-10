// @ff/brain/service/paths — the brain home (`~/.ff-brain`, overridable by FF_BRAIN_HOME) and its layout
// (SPEC R-5). Directories are 0700; files the service creates are 0600.
import { chmodSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { BRAIN_ENV, BRAIN_HOME_LAYOUT } from '../contract.js';
import type { ScopeSeed } from '../domain/genesis.js';

export interface BrainHomePaths {
  home: string;
  socket: string;
  token: string;
  /** SPEC-R1 R-03: the gateway mandate token (0600) → reader `sys:gateway`. */
  gatewayToken: string;
  /** HMAC key for body-less hashes (friction, idem body tag — W3): 32 random bytes hex, 0600. */
  secret: string;
  storeDir: string;
  journal: string;
  lock: string;
  readers: string;
  service: string;
  backups: string;
  outbox: string;
  export: string;
}

/** `FF_BRAIN_HOME` → that dir; else `~/.ff-brain`. */
export function resolveHome(env: NodeJS.ProcessEnv = process.env): string {
  return env[BRAIN_ENV.home] || join(homedir(), '.ff-brain');
}

export function homePaths(home: string): BrainHomePaths {
  const p = (k: keyof typeof BRAIN_HOME_LAYOUT) => join(home, BRAIN_HOME_LAYOUT[k]);
  const journal = p('journal');
  return {
    home,
    socket: p('socket'),
    token: p('token'),
    gatewayToken: p('gatewayToken'),
    secret: join(home, 'secret'),
    storeDir: p('storeDir'),
    journal,
    lock: `${journal}.lock`,
    readers: p('readers'),
    service: p('service'),
    backups: p('backups'),
    outbox: p('outbox'),
    export: p('export'),
  };
}

/** Create the home tree (0700). Existing dirs are tightened to 0700 as well. */
export function ensureHome(paths: BrainHomePaths): void {
  for (const dir of [paths.home, paths.storeDir, paths.backups, paths.outbox, paths.export]) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    chmodSync(dir, 0o700);
  }
}

/** `~/.ff-brain/service.json` — owner-edited service config. Every key optional. */
export interface ServiceConfig {
  /** Scopes seeded with genesis (R-10: the owner's list of companies/projects). */
  scopes?: ScopeSeed[];
  /** Second backup location (R-4, risk R-9). Absent → local backups only. */
  backup_mirror?: string;
  /** Local hour (0–23) of the nightly backup. Default 3. */
  nightly_backup_hour?: number;
}

export function readServiceConfig(path: string): ServiceConfig {
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as ServiceConfig) : {};
  } catch (e) {
    throw new Error(`ff-brain: ${path} is not valid JSON (${(e as Error).message})`);
  }
}
