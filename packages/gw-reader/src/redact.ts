// @ff/gw-reader — line-level secret filter (ADR-0018 D3). Runs BEFORE any text leaves the reader.
//
// Fail-closed by design: a false positive hides a harmless line, a false negative leaks a secret into
// the model context and its trace. When in doubt the line is hidden. Never log the input.
//
// Three tiers (red-team 05-critic-redact-redteam, B1–B7):
//  • STRONG word (пароль/пасс/pw/parol/p4ssw0rd/seed phrase… incl. voice/typo forms) anywhere in a line →
//    the whole line is hidden AND the next 2 non-empty lines AND (in reader.ts) the next message of the
//    same topic within 10 minutes. We do not try to tell "talking about passwords" from "giving one".
//  • WEAK keyword (token/ключ/доступ/логин/pin/код доступа…) → hidden only with a separator or a
//    value-looking token next to it (these words are common in normal talk).
//  • SHAPE rules without any keyword: vendor prefixes, URI creds, ip:port:user:pass, CLI -p<value>,
//    Luhn-valid card numbers, long opaque runs.
// Known gaps (ADR-0018 «Известные пробелы»): a passphrase / PIN with no keyword in the message and no
// keyword in the previous one, a bare password with no context, spelled-out values in a later message.

export const REDACTED_LINE = '[строка скрыта: возможный секрет]';

// Unicode-aware "word boundary" (JS \b is ASCII-only and breaks on Cyrillic).
const NB = '(?<![\\p{L}\\p{N}_])';
const NE = '(?![\\p{L}\\p{N}_])';

/**
 * Strong credential words — the line is hidden whenever one occurs, value or not.
 * Includes voice-to-text / typo forms seen in the red-team: пасс, парль, пароьл, pasword, parol, p4ssw0rd.
 */
const STRONG =
  '(?:' +
  [
    'парол\\p{L}*',
    'пароьл\\p{L}*',
    'парль\\p{L}*',
    'пор[оа]л(?:ь|я|ем|ю|и|ей)' + NE,
    'пасс(?:а|у|ом|ы|ик)?' + NE,
    'parol\\p{L}*',
    'pass(?:word\\p{L}*|wd|phrase\\p{L}*|w|code)?' + NE,
    'pas+w\\p{L}*',
    'p[a4@]s{1,2}w[o0]r[dt]\\p{L}*',
    'pwd?' + NE,
    'seed[\\s_-]*(?:phrase|фраз\\p{L}*)',
    'seed\\s*[:=]',
    'сид[\\s-]*фраз\\p{L}*',
    'мнемоник\\p{L}*',
    'mnemonic\\p{L}*',
    'recovery[\\s_-]*(?:phrase|key|code)',
    'cvv\\d?' + NE,
    'cvc\\d?' + NE,
  ].join('|') +
  ')';

/** Weak keywords: hidden only together with a separator or a value-looking token. */
const KW =
  '(?:' +
  STRONG +
  '|pin(?:[\\s-]?cod\\p{L}*)?' + NE +
  '|пин(?:[\\s-]?код\\p{L}*)?' + NE +
  '|код\\p{L}*\\s+доступа|код\\p{L}*\\s+подтвержд\\p{L}*|(?:смс|sms)' + NE + '|otp' + NE + '|2fa' + NE +
  '|token\\p{L}*|токен\\p{L}*|secret\\p{L}*|секрет\\p{L}*|' +
  'api[_ -]?key\\p{L}*|apikey|access[_ -]?key|private[_ -]?key|client[_ -]?secret|ключ\\p{L}*\\s+доступа|ключ\\p{L}*\\s+api|' +
  'bearer|authorization|auth|credential\\p{L}*|креды|кред\\p{L}*)';

/** Context words that are harmless alone but announce a credential when followed by ":" / "=". */
const COLON_CTX =
  '(?:ключ(?:и|а|у|ом)?|keys?|доступ\\p{L}*|креды|кред\\p{L}*|login|логин\\p{L}*|user(?:name)?|юзер\\p{L}*|' +
  'wi-?fi|вай-?фа\\p{L}*|роутер\\p{L}*|router)' + NE;

/** Context words for a `x / y` credential pair on the same line. */
const PAIR_CTX =
  '(?:root|admin\\p{L}*|админ\\p{L}*|ubuntu|deploy|user(?:name)?|юзер\\p{L}*|login|логин\\p{L}*|доступ\\p{L}*|креды|' +
  'кред\\p{L}*|wi-?fi|вай-?фа\\p{L}*|роутер\\p{L}*|router)' + NE;

const STRONG_RE = new RegExp(`${NB}${STRONG}`, 'iu');
/** "п а р о л ь" / "p-a-s-s" spelled letter by letter. */
const SPELLED_RE = /п[\s,.-]+а[\s,.-]+р[\s,.-]+о[\s,.-]+л|p[\s,.-]+a[\s,.-]+s[\s,.-]+s/iu;
/** Separator between keyword and value. A bare "-" counts only with whitespace on a side ("Токен-экономика" is not). */
const SEP = '(?:[:=]|=>|->|[—–]|\\s-|-\\s)';

const LINE_RULES: readonly RegExp[] = [
  // URI with credentials: scheme://user:pass@host
  /[a-z][\w+.-]*:\/\/[^\s:/@]+:[^\s@]+@/iu,
  // keyword [up to 3 words] separator value: "пароль: x", "Токен бота — x", "api key от сервиса = x"
  new RegExp(`${NB}${KW}(?:\\s+[\\p{L}_]+){0,3}\\s*${SEP}\\s*\\S+`, 'iu'),
  // keyword [up to 2 words] value-looking token (digit or symbol): "мой пин 4821", "токен от бота x_9"
  new RegExp(`${NB}${KW}(?:\\s+[\\p{L}_]+){0,2}\\s+["'«]?\\S*[\\d!@#$%^&*_+=]\\S*`, 'iu'),
  // "ключ: x", "доступ: x", "login = x", "Wi-Fi: x"
  new RegExp(`${NB}${COLON_CTX}\\s*[:=]\\s*\\S+`, 'iu'),
  // "root / Qwerty123", "доступ deploy/hunter2" — a slash pair next to a credential context word
  new RegExp(`${NB}${PAIR_CTX}.*(?:\\S\\s+\\/\\s+\\S|(?<!\\S)[^\\s/:]+\\/(?=[^\\s/]*[\\d!@#$%^&*A-Z])[^\\s/]+(?!\\S))`, 'iu'),
  // a line that is only "word / value-with-digit-or-symbol"
  /^\s*[^\s/]{2,}\s+\/\s+(?=\S*[\d!@#$%^&*])[^\s/]{4,}\s*$/u,
  // ip[:port]:user:pass  and  host:port:user:pass
  /(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?::\d{2,5})?(?::[^\s:]+){2,}/u,
  /(?<![\w.])[a-z0-9][\w.-]*:\d{2,5}:[^\s:]+:[^\s:]+/iu,
  // CLI password flags: -pSECRET (needs a digit/symbol/capital so `-print`, `-path` pass), --password=…
  /(?<!\S)-p(?=[^\s-]*[\d!@#$%^&*A-Z])[^\s-]\S{2,}/u,
  /(?<!\S)--?(?:pass\w*|pwd|token|secret|api-?key|auth\w*)(?:=|\s+)\S+/iu,
  // ssh/scp/db clients with an inline password
  /\b(?:ssh|scp|sftp|sshpass|mysql|psql|redis-cli|mongo\w*)\b.*\s(?:pw|pwd|pass|пасс|пароль)\s+\S+/iu,
  // Bearer / Basic auth headers
  /\b(?:bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,}/iu,
  // PEM blocks (also handled statefully below)
  /-----BEGIN [A-Z0-9 ]*(?:PRIVATE KEY|CERTIFICATE|KEY)[A-Z ]*-----/u,
  // vendor token prefixes
  /(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{8,}/u,
  /(?<![A-Za-z0-9])(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{8,}/u,
  /(?<![A-Za-z0-9])(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{10,}/u,
  /github_pat_[A-Za-z0-9_]{10,}/u,
  /(?<![A-Za-z0-9])xox[abposr]-[A-Za-z0-9-]{6,}/iu,
  /(?<![A-Za-z0-9])glpat-[A-Za-z0-9_-]{10,}/u,
  /(?<![A-Za-z0-9])npm_[A-Za-z0-9]{20,}/u,
  /(?<![A-Za-z0-9])SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/u,
  /(?<![A-Za-z0-9])AC[0-9a-f]{32}(?![0-9a-f])/u,
  /AKIA[0-9A-Z]{16}/u,
  /AIza[0-9A-Za-z_-]{20,}/u,
  // Telegram bot token: 123456789:AA…
  /\d{6,}:[A-Za-z0-9_-]{30,}/u,
  // JWT
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\./u,
  // long hex run (≥32)
  /(?<![0-9a-fA-F])[0-9a-fA-F]{32,}(?![0-9a-fA-F])/u,
];

/** Long base64/url-safe run (≥32) with letters+digits; paths with many '/' are not tokens. */
function hasOpaqueToken(line: string): boolean {
  const runs = line.match(/[A-Za-z0-9+/=_-]{32,}/gu);
  if (!runs) return false;
  for (const r of runs) {
    const slashes = (r.match(/\//gu) ?? []).length;
    if (slashes > 2) continue;
    if (/\d/u.test(r) && /[A-Za-z]/u.test(r)) return true;
  }
  return false;
}

function luhnOk(digits: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/** Card number: 13–19 digits (spaces/hyphens allowed) passing Luhn. */
function hasCardNumber(line: string): boolean {
  for (const m of line.matchAll(/(?<![\d-])\d(?:[ -]?\d){12,18}(?![\d])/gu)) {
    const digits = m[0].replace(/[ -]/gu, '');
    if (digits.length >= 13 && digits.length <= 19 && luhnOk(digits)) return true;
  }
  return false;
}

const USER_AT_HOST = /(?<![\w.+-])[\w.+-]+@[\w-]+(?:\.[\w-]+)*(?![\w@])/u;
const KW_ANY = new RegExp(`${NB}${KW}`, 'iu');
/** A password-looking standalone token: ≥6 chars with a letter and a digit, or with a special symbol. */
const PASSWORDISH = /(?<!\S)(?=[^\s@]*\d)(?=[^\s@]*\p{L})[^\s@/]{6,}(?!\S)|(?<!\S)(?=\S*[!#$%^&*])[^\s@/]{6,}(?!\S)/u;
/** Line ends with a keyword (+ optional separator) → the value is on the following line(s). */
const KW_TRAILING = new RegExp(`${NB}(?:${KW}|${COLON_CTX})\\s*${SEP}?\\s*$`, 'iu');
/** Credential context with a value on the line ("user: admin") → the next line likely holds the pair. */
const COLON_CTX_RE = new RegExp(`${NB}${COLON_CTX}\\s*[:=]\\s*\\S+`, 'iu');

/** How many following non-empty lines are hidden after a credential-context line. */
export const FOLLOW_LINES = 2;

function lineIsSecret(line: string): boolean {
  if (LINE_RULES.some((re) => re.test(line))) return true;
  return hasOpaqueToken(line) || hasCardNumber(line);
}

function passwordish(line: string): boolean {
  const withoutAddr = line.replace(new RegExp(USER_AT_HOST.source, 'gu'), ' ').replace(/\S+:\/\/\S+/gu, ' ');
  return KW_ANY.test(withoutAddr) || PASSWORDISH.test(withoutAddr);
}

/** True when the text contains a strong credential word (used for the cross-message carry window). */
export function hasStrongWord(text: string): boolean {
  return text.split(/\r?\n/u).some((l) => STRONG_RE.test(l) || SPELLED_RE.test(l));
}

export interface RedactOptions {
  /**
   * The previous message of the same topic (≤ carry window) announced a credential — hide this whole
   * message (fail-closed: the value is likely here, e.g. "пароль от сервера" → next message "Xk9mP2").
   */
  carry?: boolean;
}

export interface RedactResult {
  text: string;
  redacted: boolean;
  /** This message contains a strong credential word → the NEXT message of the topic gets `carry`. */
  strong: boolean;
}

/** Redacts a whole message line-by-line. Pure; never logs. */
export function redactText(input: string, opts: RedactOptions = {}): RedactResult {
  const lines = input.split(/\r?\n/u);
  const hide = new Array<boolean>(lines.length).fill(false);
  let inPem = false;
  let strong = false;
  /** Pending count of following non-empty lines to hide. */
  let follow = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const blank = /^\s*$/u.test(line);
    if (opts.carry) {
      hide[i] = !blank;
    }
    if (follow > 0) {
      if (blank) {
        hide[i] = true;
      } else {
        hide[i] = true;
        follow--;
      }
    }
    if (inPem) {
      hide[i] = true;
      if (/-----END [A-Z0-9 ]*-----/u.test(line)) inPem = false;
      continue;
    }
    if (/-----BEGIN [A-Z0-9 ]*-----/u.test(line)) {
      hide[i] = true;
      inPem = !/-----END [A-Z0-9 ]*-----/u.test(line.replace(/-----BEGIN [A-Z0-9 ]*-----/u, ''));
      continue;
    }
    if (blank) continue;
    let context = false;
    if (STRONG_RE.test(line) || SPELLED_RE.test(line)) {
      // Strong word anywhere → whole line, value or not, plus the following lines.
      strong = true;
      context = true;
    }
    if (KW_TRAILING.test(line) || COLON_CTX_RE.test(line)) context = true;
    if (context) {
      hide[i] = true;
      follow = Math.max(follow, FOLLOW_LINES);
    }
    if (lineIsSecret(line)) hide[i] = true;
    // user@host + password on the same or next line → hide both.
    if (USER_AT_HOST.test(line)) {
      const next = lines[i + 1];
      if (passwordish(line)) hide[i] = true;
      if (next !== undefined && passwordish(next)) {
        hide[i] = true;
        hide[i + 1] = true;
      }
    }
  }

  let redacted = false;
  const out = lines.map((l, i) => {
    if (!hide[i]) return l;
    redacted = true;
    return REDACTED_LINE;
  });
  return { text: out.join('\n'), redacted, strong };
}
