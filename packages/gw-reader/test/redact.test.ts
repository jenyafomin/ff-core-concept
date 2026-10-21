import { describe, expect, it } from 'vitest';
import { REDACTED_LINE, hasStrongWord, redactText } from '../src/redact.js';
import { ADVERSARIAL, BENIGN, BENIGN_ACCEPTED_LOSS } from './fixtures/redteam.js';

// Fake secrets are assembled at runtime so the repo never contains a literal token.
const GHP = 'ghp_' + 'Ab1'.repeat(12);
const SK = 'sk-' + 'proj' + 'X9'.repeat(12);
const HEX = 'deadbeef'.repeat(5);
const B64 = 'QmFzZTY0' + 'S2V5MTIz'.repeat(4);

const MUST_HIDE: Array<[string, string]> = [
  ['amqp uri', 'подключение amqp://admin:S3cretPass@10.0.0.5:5672/vhost'],
  ['postgres uri', 'DATABASE_URL=postgres://user:pa55@db.local/app'],
  ['пароль:', 'пароль: Abc123'],
  ['Пароль inflected', 'Паролем Qwerty12 не делись'],
  ['password=', 'password=hunter2'],
  ['passwd', 'passwd: x'],
  ['token:', 'token: abc.def.ghi'],
  ['токен', 'Токен бота — 77fgh2'],
  ['secret', 'client_secret = zzz'],
  ['api key', 'API_KEY=foo'],
  ['api-key spaced', 'мой api key: 12345'],
  ['ключ доступа', 'ключ доступа: QWE-RTY'],
  ['bearer', 'Authorization: Bearer abcdefghijklmnop'],
  ['ghp', `вот ${GHP}`],
  ['sk-', `ключ ${SK}`],
  ['slack', 'xoxb-1234567890-abcdef'],
  ['long hex', `hash ${HEX}`],
  ['long b64', `blob ${B64}`],
  ['telegram bot token', '123456789:AAEhBP0av1D8fZxOk3J9YqgTPV7xZ3sR2mY'],
];

describe('redactText — fail-closed secret filter', () => {
  for (const [name, line] of MUST_HIDE) {
    it(`hides: ${name}`, () => {
      const r = redactText(`привет\n${line}\nпока`);
      expect(r.redacted).toBe(true);
      // The line before is kept; the line itself is hidden. The line after may be hidden too
      // (credential-context lines also hide the next 2 non-empty lines — fail-closed).
      expect(r.text.startsWith(`привет\n${REDACTED_LINE}`)).toBe(true);
    });
  }

  it('hides a whole PEM private key block', () => {
    const pem = ['ключ ниже', '-----BEGIN OPENSSH PRIVATE KEY-----', 'b3BlbnNzaC1rZXktdjEAAAAA', 'QUJDREVGR0g=', '-----END OPENSSH PRIVATE KEY-----', 'после'].join('\n');
    const r = redactText(pem);
    expect(r.redacted).toBe(true);
    expect(r.text).not.toMatch(/BEGIN|END|b3Blbn|QUJDREVG/u);
    expect(r.text.startsWith('ключ ниже\n')).toBe(true);
    expect(r.text.endsWith('\nпосле')).toBe(true);
  });

  it('hides an unterminated PEM block to the end', () => {
    const r = redactText('-----BEGIN RSA PRIVATE KEY-----\nMIIEow\nhello');
    expect(r.text.split('\n').every((l) => l === REDACTED_LINE)).toBe(true);
  });

  it('hides "Пароль:" header AND the next 2 non-empty lines', () => {
    const r = redactText('Пароль:\nZx9!long\nдальше\nтретья');
    expect(r.text).toBe(`${REDACTED_LINE}\n${REDACTED_LINE}\n${REDACTED_LINE}\nтретья`);
  });

  it('hides user@host with a password on the same line', () => {
    const r = redactText('ssh root@1.2.3.4 Pw0rd77');
    expect(r.text).toBe(REDACTED_LINE);
  });

  it('hides user@host with a password on the next line (both lines)', () => {
    const r = redactText('root@server.example\nqwe123rty\nok');
    expect(r.text).toBe(`${REDACTED_LINE}\n${REDACTED_LINE}\nok`);
  });

  it('keeps ordinary owner text untouched', () => {
    const plain = 'Надо купить молоко\nи позвонить маме в 18:00\nпосмотри docs/02-project/core';
    const r = redactText(plain);
    expect(r.redacted).toBe(false);
    expect(r.text).toBe(plain);
  });
});

const hiddenAll = (text: string) =>
  redactText(text)
    .text.split('\n')
    .every((l, i) => l === REDACTED_LINE || /^\s*$/u.test(text.split(/\r?\n/u)[i] ?? ''));

describe('red-team 2026-10-12 (B1–B7): 50 adversarial lines', () => {
  for (const [id, text] of ADVERSARIAL) {
    it(`hides every non-blank line: ${id}`, () => {
      const r = redactText(text);
      expect(r.redacted).toBe(true);
      expect(hiddenAll(text)).toBe(true);
    });
  }

  it('summary: ≥45 of 50 hidden (actual: all 50)', () => {
    const hidden = ADVERSARIAL.filter(([, t]) => hiddenAll(t)).length;
    expect(hidden).toBeGreaterThanOrEqual(45);
    expect(hidden).toBe(ADVERSARIAL.length);
  });
});

describe('red-team 2026-10-12: 15 benign lines are not cut (except the accepted fail-closed loss)', () => {
  for (const [id, text] of BENIGN) {
    const loss = BENIGN_ACCEPTED_LOSS.has(id);
    it(`${loss ? 'accepted loss (strong word)' : 'keeps'}: ${id}`, () => {
      const r = redactText(text);
      expect(r.redacted).toBe(loss);
      if (!loss) expect(r.text).toBe(text);
    });
  }

  it('summary: ≥10 of 15 benign pass', () => {
    expect(BENIGN.filter(([, t]) => !redactText(t).redacted).length).toBeGreaterThanOrEqual(10);
  });
});

describe('review M1 forms + new rules', () => {
  const MUST: Array<[string, string]> = [
    ['password is …', 'password is correcthorsebattery'],
    ['мой пин', 'мой пин 4821'],
    ['код доступа', 'код доступа 482915'],
    ['parol', 'parol qwerty123'],
    ['wi-fi pair', 'Wi-Fi: HomeNet / hunter2xyz'],
    ['--password=', 'run --password=Zx9plain'],
    ['--token', 'cli --token abcdef'],
    ['psql pw', 'psql -h db pass Zz11zz'],
    ['host:port:user:pass', 'db.local:5432:app:S3cr3tXX'],
    ['seed colon', 'seed: alpha beta gamma'],
    ['мнемоника', 'мнемоника лежит в сейфе'],
    ['card dashes', '4111-1111-1111-1111'],
    ['spelled', 'p a s s дам потом'],
  ];
  for (const [name, line] of MUST) {
    it(`hides: ${name}`, () => {
      expect(redactText(`ок\n${line}`).text).toBe(`ок\n${REDACTED_LINE}`);
    });
  }

  it('hides the next 2 NON-EMPTY lines after a strong word (blank lines skipped and hidden)', () => {
    const r = redactText('пароль ниже\n\n\nQwe12345\nвторая\nтретья');
    expect(r.text.split('\n')).toEqual([REDACTED_LINE, REDACTED_LINE, REDACTED_LINE, REDACTED_LINE, REDACTED_LINE, 'третья']);
    expect(r.strong).toBe(true);
  });

  it('carry: hides the whole message; strong flag reports strong words only', () => {
    expect(redactText('Xk9mP2\nещё', { carry: true }).text).toBe(`${REDACTED_LINE}\n${REDACTED_LINE}`);
    expect(redactText('токен: abc').strong).toBe(false);
    expect(hasStrongWord('пасс от роутера')).toBe(true);
    expect(hasStrongWord('купить молоко')).toBe(false);
  });

  it('does not hide ordinary hyphens, find flags, single paths or non-Luhn numbers', () => {
    for (const ok of [
      'Токен-экономика растёт',
      'find . -print -path x',
      'сервер шлюза: pm2 restart',
      'заказ 1234 5678 9012 3456',
      'ключевая идея — граф',
      'смотри docs/02-project и packages/gw-reader',
    ]) {
      expect(redactText(ok).redacted, ok).toBe(false);
    }
  });
});
