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
      if (onError) for (const w of writeScopeWarnings(cached)) onError(w);
    } catch (e) {
      onError?.(`readers.json unreadable (${(e as Error).message}) — denying everyone until fixed`);
      cached = EMPTY;
    }
    return cached;
  };
}

/**
 * SPEC-access-and-overview: `write_scopes` entries outside the binding's `scopes` are ignored (write ⇒ read) —
 * say so once per file change. Literal comparison (a slug vs its `scope:` id counts as the same).
 */
export function writeScopeWarnings(readers: ReadersFile): string[] {
  const norm = (s: string) => (s.startsWith('scope:') ? s.slice('scope:'.length) : s);
  const out: string[] = [];
  const check = (where: string, b: { scopes?: unknown; write_scopes?: unknown } | undefined) => {
    if (!b || b.write_scopes === undefined) return;
    if (!Array.isArray(b.write_scopes)) {
      out.push(`readers.json ${where}: write_scopes is not a list — no write for this binding`);
      return;
    }
    const read = new Set((Array.isArray(b.scopes) ? b.scopes : []).filter((s): s is string => typeof s === 'string').map(norm));
    const extra = b.write_scopes.filter((s) => typeof s !== 'string' || !read.has(norm(s)));
    if (extra.length) out.push(`readers.json ${where}: write_scopes outside scopes are ignored: ${extra.map(String).join(', ')}`);
  };
  for (const [k, b] of Object.entries(readers.chats)) {
    // a topic inherits the chat's `scopes` when it sets none (shallow chat → thread merge, as the resolver does)
    const chat = k.includes(':') ? readers.chats[k.slice(0, k.indexOf(':'))] : undefined;
    check(`chats[${k}]`, { ...(chat ?? {}), ...b });
  }
  for (const [k, b] of Object.entries(readers.cli ?? {})) check(`cli[${k}]`, b);
  return out;
}
