// @ff/brain/service/readers — `readers.json` source for the reader resolver (R-7). Re-read when the file's
// mtime/size changes (the owner edits it while the service runs). Missing or broken file → empty allowlist
// (everything is DEFAULT_DENY) — fail closed, never fail open.
import { existsSync, readFileSync, statSync } from 'node:fs';

import type { ReadersFile } from '../contract.js';

const EMPTY: ReadersFile = { owner_id: '', chats: {} };

export function readersLoader(path: string, onError?: (msg: string) => void): () => ReadersFile {
  let stamp = '';
  let cached: ReadersFile = EMPTY;
  return () => {
    if (!existsSync(path)) {
      stamp = '';
      cached = EMPTY;
      return cached;
    }
    const st = statSync(path);
    const s = `${st.mtimeMs}:${st.size}`;
    if (s === stamp) return cached;
    stamp = s;
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<ReadersFile>;
      cached = {
        owner_id: typeof parsed.owner_id === 'string' || typeof parsed.owner_id === 'number' ? String(parsed.owner_id) : '',
        chats: parsed.chats && typeof parsed.chats === 'object' ? parsed.chats : {},
        ...(parsed.cli && typeof parsed.cli === 'object' ? { cli: parsed.cli } : {}),
      };
    } catch (e) {
      onError?.(`readers.json unreadable (${(e as Error).message}) — denying everyone until fixed`);
      cached = EMPTY;
    }
    return cached;
  };
}
