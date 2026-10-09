// @ff/brain/service/auth — the Bearer token (SPEC R-5, AC-23): `~/.ff-brain/token`, 0600, 32 random bytes
// (hex), created on first start. Compared in constant time.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

export const TOKEN_BYTES = 32;

/** Read the token, creating it (0600) if missing/empty. Always leaves the file at 0600. */
export function ensureToken(path: string): string {
  if (existsSync(path)) {
    const t = readFileSync(path, 'utf8').trim();
    if (t) {
      chmodSync(path, 0o600);
      return t;
    }
  }
  const token = randomBytes(TOKEN_BYTES).toString('hex');
  writeFileSync(path, `${token}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
  return token;
}

/**
 * The service secret (`~/.ff-brain/secret`, 0600, next to the token): the HMAC key of every body-less hash
 * (friction, idem body tag — review W3). Same shape and lifecycle as the token, but never sent anywhere.
 */
export const ensureSecret = (path: string): string => ensureToken(path);

/** True when the `authorization` header is exactly `Bearer <token>`. */
export function checkBearer(header: string | undefined, token: string): boolean {
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  const given = Buffer.from(header.slice('Bearer '.length).trim(), 'utf8');
  const want = Buffer.from(token, 'utf8');
  return given.length === want.length && timingSafeEqual(given, want);
}
