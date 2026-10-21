// Red-team fixtures for redact.ts (05-critic-redact-redteam.analysis.md, 2026-10-12).
// ALL values are synthetic. Vendor-shaped literals are split with '+' so secret scanners never see a token.

/** 50 adversarial lines: every non-blank line must come out hidden. */
export const ADVERSARIAL: ReadonlyArray<readonly [id: string, text: string]> = [
['A01','пароль от сервера такой-то 9fG!x'],
['A02','пасс от роутера Zq7vLm2'],
['A03','пароль на следующей строке\nmyS3rverKey'],
['A04','root / Qwerty123'],
['A05','ssh deploy@203.0.113.7 pw Abc'],
['A06','логин admin пароль admin'],
['A07','ключ: 7Hk2pQ9xLm'],
['A08','вот доступ: deploy / hunter2'],
['A09','203.0.113.7:2222:ubuntu:Tr0ub4dor'],
['A10','ey'+'JhbGciOiJIUzI1NiJ9.ey'+'JzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk'],
['A11','AK'+'IAIOSFODNN7EXAMPLE'],
['A12','бот 123456789:'+'AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw'],
['A13','sk'+'-proj-abcDEF123456ghiJKL789'],
['A14','sk'+'_live_4eC39HqLyjWDarjtT1zdp7dc'],
['A15','пароль один два три четыре'],
['A16','пароль "correct horse battery staple"'],
['A17','пароль:\n\nQwe12345'],
['A18','parol ot servera Gh7Kl2'],
['A19','пароьл от вайфая Kk99zz!'],
['A20','pasword: Hunter2'],
['A21','парль: Sup3rS3cret'],
['A22','login: ivan\npass\nSecretWord1'],
['A23','пароль\nqwerty'],
['A24','мой пароль Qwerty'],
['A25','пароль от почты — лошадь'],
['A26','pw: letmein'],
['A27','postgres://app:S3cr3t@db.local/prod'],
['A28','mysql -u root -pMyRootPass123 -h 10.0.0.5'],
['A29','curl -H "X-API-Key: abcd1234efgh5678" https://x'],
['A30','Authorization: Token abcdef123456'],
['A31','ключ от api: sk'+'-ant-api03-AbCdEf_123456-xyz'],
['A32','продиктую: п а р о л ь, ку 7 е 3 эр'],
['A33','пароль 9 5 1 7 3'],
['A34','код из смс 482913'],
['A35','seed phrase: apple river stone table cloud mango tiger piano house green lamp ocean'],
['A36','secret=abc'],
['A37','P@ssw0rd'],
['A38','пароль аш кей эл 7'],
['A39','user: admin\nрас: Z9x8c7v6'],
['A40','Пароль от админки - Admin2024'],
['A41','пароль от сервера: \u200bQ9w8e7r6'],
['A42','ПАРОЛЬ Pr0d2024x'],
['A43','p4ssw0rd: tiger99'],
['A44','ssh root@10.1.1.1\nqwe123RTY'],
['A45','stripe rk'+'_live_51HxYzAbCdEfGhIjKlMnOpQrSt'],
['A46','npm'+'_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789'],
['A47','AI'+'zaSyA-1234567890abcdefghijklmnopqrstu'],
['A48','AWS secret wJalrXUtnFEMI/'+'K7MDENG/bPxRfiCYEXAMPLEKEY'],
['A49','логин ivan, пароль у Лены в заметке, там 8 символов: dragon42'],
['A50','card 4111 1111 1111 1111 cvv 123'],
];

/**
 * Hidden on purpose although harmless (fail-closed cost): a strong word (пароль/пасс) anywhere hides the
 * line — discussing passwords as a topic is not told apart from giving one.
 */
export const BENIGN_ACCEPTED_LOSS: ReadonlySet<string> = new Set(['F01', 'F03', 'F05', 'F12']);

/** 15 benign lines; all except BENIGN_ACCEPTED_LOSS must pass untouched. */
export const BENIGN: ReadonlyArray<readonly [id: string, text: string]> = [
['F01','Давай обсудим, как хранить пароли в мозге: хэш или vault?'],
['F02','токены у Claude дорогие, 200k токенов контекста съедает бюджет'],
['F03','нужен менеджер паролей, 1Password или Bitwarden?'],
['F04','Токен-экономика: сколько токенов уходит на одну сессию - около 50к'],
['F05','пасс на вечеринку нужен, пока не знаю у кого'],
['F06','секрет успеха в том, чтобы вставать в 6 утра'],
['F07','авторизация через Telegram: нужна ли она в v1?'],
['F08','pin сообщения в топике 56 сделаем завтра'],
['F09','ключевая идея — граф, ключ доступа к нему потом'],
['F10','путь docs/02-project/core/01-brain/01-overview/05-brain-direction/START-NEXT-SESSION.md'],
['F11','коммит b76d124 и c60dad5 уже влиты'],
['F12','пароль: надо будет сменить на следующей неделе'],
['F13','напиши ссылку https://github.com/JenyaFomin/ff/pull/123'],
['F14','почта jenya@example.com, звони завтра'],
['F15','ADR-0018 gateway-log-reader proposed'],
];
