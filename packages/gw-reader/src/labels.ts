// @ff/gw-reader — owner labels (ADR-0018 D5). Append-only JSONL in the reader's OWN file;
// the gateway DB is never written. Last entry per address wins.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { parseAddress } from './address.js';

export const LABEL_VALUES = ['open', 'closed', 'mute'] as const;
export type LabelValue = (typeof LABEL_VALUES)[number];
export const NOTE_MAX = 500;

export interface LabelEntry {
  ts: string;
  address: string;
  label: LabelValue;
  note?: string;
}

export function labelsPathFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  return env.GW_READER_LABELS?.trim() || join(homedir(), '.ff-gw-reader', 'labels.jsonl');
}

/** Canonical `gw:<alias>/t<N>/m<id>` (trimmed, re-rendered) or null when the address is malformed. */
export function canonicalAddress(address: string): string | null {
  const a = parseAddress(address);
  return a ? `gw:${a.chatAlias}/t${a.thread}/m${a.mid}` : null;
}

export function appendLabel(path: string, entry: Omit<LabelEntry, 'ts'>, now: () => number = Date.now): LabelEntry {
  const address = canonicalAddress(entry.address);
  if (!address) throw new Error('bad_address');
  const full: LabelEntry = { ts: new Date(now()).toISOString(), address, label: entry.label };
  if (entry.note !== undefined && entry.note !== '') full.note = entry.note.slice(0, NOTE_MAX);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  appendFileSync(path, `${JSON.stringify(full)}\n`, { encoding: 'utf8', mode: 0o600 });
  return full;
}

/** Current labels: last entry per canonical address wins. Corrupt lines and malformed addresses are skipped. */
export function currentLabels(path: string): LabelEntry[] {
  if (!existsSync(path)) return [];
  const last = new Map<string, LabelEntry>();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as LabelEntry;
      const address = typeof e.address === 'string' ? canonicalAddress(e.address) : null;
      if (address && (LABEL_VALUES as readonly string[]).includes(e.label)) {
        last.delete(address);
        last.set(address, { ...e, address });
      }
    } catch {
      // skip corrupt line
    }
  }
  return [...last.values()];
}
