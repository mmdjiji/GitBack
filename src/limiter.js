const { URL } = require('url');

// Rate limit profiles per hostname
const PROFILES = {
  'github.com': { concurrency: 3, intervalMs: 2000 },
  'gitlab.com': { concurrency: 5, intervalMs: 1000 },
  'cnb.cool': { concurrency: 3, intervalMs: 2000 },
};
const DEFAULT_PROFILE = { concurrency: 2, intervalMs: 3000 };

class DomainLimiter {
  constructor() {
    // Per-hostname state: { running: number, queue: [] , lastRun: timestamp }
    this.buckets = new Map();
  }

  _getBucket(hostname) {
    if (!this.buckets.has(hostname)) {
      const profile = PROFILES[hostname] || DEFAULT_PROFILE;
      this.buckets.set(hostname, {
        ...profile,
        running: 0,
        queue: [],
        lastRun: 0,
      });
    }
    return this.buckets.get(hostname);
  }

  /**
   * Schedule a task for the given URL's hostname.
   * Returns a promise that resolves when the task completes.
   */
  schedule(repoUrl, fn) {
    let hostname;
    try {
      hostname = new URL(repoUrl).hostname;
    } catch {
      hostname = '_unknown';
    }

    const bucket = this._getBucket(hostname);

    return new Promise((resolve, reject) => {
      bucket.queue.push({ fn, resolve, reject });
      this._drain(hostname);
    });
  }

  _drain(hostname) {
    const bucket = this._getBucket(hostname);

    while (bucket.queue.length > 0 && bucket.running < bucket.concurrency) {
      const now = Date.now();
      const elapsed = now - bucket.lastRun;

      if (elapsed < bucket.intervalMs && bucket.lastRun > 0) {
        // Need to wait before next execution
        const delay = bucket.intervalMs - elapsed;
        setTimeout(() => this._drain(hostname), delay);
        return;
      }

      const { fn, resolve, reject } = bucket.queue.shift();
      bucket.running++;
      bucket.lastRun = Date.now();

      Promise.resolve()
        .then(() => fn())
        .then(resolve)
        .catch(reject)
        .finally(() => {
          bucket.running--;
          this._drain(hostname);
        });
    }
  }
}

// Singleton instance
const limiter = new DomainLimiter();

module.exports = { limiter, DomainLimiter, PROFILES, DEFAULT_PROFILE };
