// @ff/brain/service/queue — THE write queue (SPEC R-5): one promise chain; every journal write (records,
// links, friction, backups) runs inside it, one task at a time, so idem-check → merge → validate →
// Engine.write → index → backup trigger is atomic with respect to other writers.

export class WriteQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private pending = 0;

  /** Tasks waiting or running. */
  get depth(): number {
    return this.pending;
  }

  run<T>(task: () => T | Promise<T>): Promise<T> {
    this.pending += 1;
    const next = this.tail.then(task);
    this.tail = next.then(
      () => undefined,
      () => undefined,
    );
    return next.finally(() => {
      this.pending -= 1;
    });
  }

  /** Resolves when everything queued so far has finished. */
  idle(): Promise<void> {
    return this.run(() => undefined);
  }
}
