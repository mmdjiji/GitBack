const { URL } = require('url');

// Rate limit profiles per hostname
// concurrency: max parallel git operations
// intervalMs: minimum gap between starting two operations
// windowMax: max operations allowed within windowMs (rolling window)
const PROFILES = {
  'github.com': { concurrency: 1, intervalMs: 10000, windowMax: 5, windowMs: 60000 },
  'gitlab.com': { concurrency: 1, intervalMs: 8000, windowMax: 6, windowMs: 60000 },
  'cnb.cool': { concurrency: 1, intervalMs: 8000, windowMax: 6, windowMs: 60000 },
};
// Self-hosted instances or unknown domains get a more relaxed profile
const DEFAULT_PROFILE = { concurrency: 3, intervalMs: 2000, windowMax: 20, windowMs: 60000 };

class DomainLimiter {
  constructor() {
    // Per-hostname state
    this.buckets = new Map();
  }

  _getBucket(hostname) {
    if (!this.buckets.has(hostname)) {
      const profile = PROFILES[hostname] || DEFAULT_PROFILE;
      this.buckets.set(hostname, {
        ...profile,
        running: 0,
        queue: [],
        // Rolling window: timestamps of recent operation starts
        windowTimestamps: [],
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

  _isWindowFull(bucket) {
    const now = Date.now();
    // Remove timestamps outside the window
    bucket.windowTimestamps = bucket.windowTimestamps.filter(
      (t) => now - t < bucket.windowMs
    );
    return bucket.windowTimestamps.length >= bucket.windowMax;
  }

  _getWindowWait(bucket) {
    if (bucket.windowTimestamps.length === 0) return 0;
    const oldest = bucket.windowTimestamps[0];
    const now = Date.now();
    // Wait until the oldest timestamp expires from the window
    return Math.max(0, bucket.windowMs - (now - oldest) + 100);
  }

  _drain(hostname) {
    const bucket = this._getBucket(hostname);

    while (bucket.queue.length > 0 && bucket.running < bucket.concurrency) {
      // Check rolling window limit
      if (this._isWindowFull(bucket)) {
        const delay = this._getWindowWait(bucket);
        console.log(`[limiter] ${hostname}: window limit reached (${bucket.windowMax}/${bucket.windowMs / 1000}s), waiting ${Math.round(delay / 1000)}s`);
        setTimeout(() => this._drain(hostname), delay);
        return;
      }

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
      bucket.windowTimestamps.push(Date.now());

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
