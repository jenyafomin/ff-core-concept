// Live read-only smoke (ADR-0018 validation). Prints ONLY counters — never message text.
// Usage: npm run smoke:live -w @ff/gw-reader   (env GW_READER_DB / GW_READER_OWNER_ID optional)
import { configFromEnv, recent, topics } from '../src/reader.js';

const cfg = configFromEnv();
const t = topics(cfg, { days: 14 });
const r3 = recent(cfg, { days: 3, limit: 5 });
const r14 = recent(cfg, { days: 14, limit: 200 });
const out = {
  gw_topics_days14: { topics: t.length, messages: t.reduce((s, x) => s + x.count, 0) },
  gw_recent_days3_limit5: { n: r3.length, redacted: r3.filter((x) => x.redacted).length, maxExcerpt: Math.max(0, ...r3.map((x) => x.text_excerpt.length)) },
  gw_recent_days14_limit200: { n: r14.length, redacted: r14.filter((x) => x.redacted).length },
};
process.stdout.write(`${JSON.stringify(out)}\n`);
