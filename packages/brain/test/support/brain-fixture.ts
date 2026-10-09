// Test fixture for @ff/brain: an isolated brain home in a tmp dir (never touches ~/.ff-brain),
// an allowlist (readers.json) shaped like the owner's real one, and caller contexts for the
// isolation cases (AC-01…05). Domain/read/service tests build on top of this.
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  BRAIN_HOME_LAYOUT,
  type CallerContext,
  type ReadersFile,
} from '../../src/contract.js';

export const OWNER_ID = '1112667160';
export const STRANGER_ID = '999000111';
export const GROUP = '-1004351636302';
export const THREAD_BRAIN = `${GROUP}:56`;
export const THREAD_AGENTS = `${GROUP}:65`;
export const UNKNOWN_CHAT = '-1000000000001';
export const CLI_CWD = '/tmp/ff-brain-fixture-cwd';

/** Fixed clock for deterministic ids/receipts. */
export const FIXED_NOW = new Date('2026-10-09T09:00:00.000Z');

export function defaultReaders(): ReadersFile {
  return {
    owner_id: OWNER_ID,
    chats: {
      [GROUP]: {
        principal: 'user:owner',
        scopes: ['scope:brain', 'scope:agents', 'scope:personal'],
        write: true,
        personal: false,
      },
      [THREAD_BRAIN]: { default_scope: 'scope:brain', scopes: ['scope:brain'] },
      [THREAD_AGENTS]: { default_scope: 'scope:agents', scopes: ['scope:agents'] },
    },
    cli: {
      [CLI_CWD]: { principal: `cli:${CLI_CWD}`, scopes: ['scope:brain'], write: true },
    },
  };
}

export interface BrainFixture {
  /** Tmp brain home (stand-in for ~/.ff-brain). */
  home: string;
  storeDir: string;
  journalPath: string;
  readersPath: string;
  path(rel: keyof typeof BRAIN_HOME_LAYOUT): string;
  writeReaders(readers: ReadersFile): void;
  cleanup(): void;
}

export function makeBrainFixture(readers: ReadersFile = defaultReaders()): BrainFixture {
  const home = mkdtempSync(join(tmpdir(), 'ff-brain-'));
  const path = (rel: keyof typeof BRAIN_HOME_LAYOUT) => join(home, BRAIN_HOME_LAYOUT[rel]);
  for (const dir of ['storeDir', 'backups', 'outbox', 'export'] as const) {
    mkdirSync(path(dir), { recursive: true, mode: 0o700 });
  }
  const fx: BrainFixture = {
    home,
    storeDir: path('storeDir'),
    journalPath: path('journal'),
    readersPath: path('readers'),
    path,
    writeReaders(r) {
      writeFileSync(path('readers'), JSON.stringify(r, null, 2), { mode: 0o600 });
    },
    cleanup() {
      rmSync(home, { recursive: true, force: true });
    },
  };
  fx.writeReaders(readers);
  return fx;
}

/** Owner writing from a gateway topic (AC-02). */
export function ownerInTopic(conversationId = THREAD_BRAIN, messageId = '1001'): CallerContext {
  return { conversation_id: conversationId, message_id: messageId, sender_id: OWNER_ID, channel: 'telegram' };
}

/** Someone else in an allowed group (AC-03). */
export function strangerInTopic(conversationId = THREAD_BRAIN): CallerContext {
  return { conversation_id: conversationId, message_id: '1002', sender_id: STRANGER_ID, channel: 'telegram' };
}

/** Chat not in readers.json (AC-01). */
export function unknownChat(): CallerContext {
  return { conversation_id: UNKNOWN_CHAT, message_id: '1003', sender_id: OWNER_ID, channel: 'telegram' };
}

/** Claude Code outside the gateway (AC-05): no conversation id, no message id → no idem. */
export function cliCaller(cwd = CLI_CWD): CallerContext {
  return { cwd };
}
