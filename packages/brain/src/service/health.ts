// @ff/brain/service/health — write-path latency (AC-47: write p95 in /health) and the /v1/health body.

/** Ring buffer of the last N write latencies (ms). */
export class LatencyTracker {
  private readonly buf: number[] = [];
  private i = 0;

  constructor(private readonly size = 1000) {}

  add(ms: number): void {
    if (this.buf.length < this.size) this.buf.push(ms);
    else {
      this.buf[this.i] = ms;
      this.i = (this.i + 1) % this.size;
    }
  }

  get count(): number {
    return this.buf.length;
  }

  /** p-th percentile (0..100), rounded to 0.01 ms; null when empty. */
  percentile(p: number): number | null {
    if (!this.buf.length) return null;
    const sorted = [...this.buf].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return Math.round(sorted[idx]! * 100) / 100;
  }
}

/** Fixed-window-per-minute counter keyed by dialog (≤ LIMITS.recordsPerMinutePerConversation). */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  private lastSweep = 0;

  constructor(private readonly perMinute: number) {}

  /** Keys currently tracked (dialogs with a hit in the last window, plus not-yet-swept ones). */
  get size(): number {
    return this.hits.size;
  }

  /** Consume one slot; false when the key is over the limit in the last 60 s. */
  take(key: string, nowMs: number): boolean {
    const since = nowMs - 60_000;
    // at most once a window: drop dialogs with no hit inside the window (the map never grows unbounded)
    if (nowMs - this.lastSweep >= 60_000) {
      this.lastSweep = nowMs;
      for (const [k, ts] of this.hits) if (!ts.some((t) => t > since)) this.hits.delete(k);
    }
    const arr = (this.hits.get(key) ?? []).filter((t) => t > since);
    if (arr.length >= this.perMinute) {
      this.hits.set(key, arr);
      return false;
    }
    arr.push(nowMs);
    this.hits.set(key, arr);
    return true;
  }
}
