/**
 * Bree worker - executed as a separate thread/process.
 * Receives job data via workerData containing the backup task info.
 *
 * workerData: {
 *   providerName: string,
 *   owner: string,
 *   repo: string,
 *   url: string,
 *   lfs: boolean,
 * }
 */
const { workerData, parentPort } = require('worker_threads');
const { backup } = require('../backup');
const { limiter } = require('../limiter');

async function run() {
  const { providerName, owner, repo, url, lfs } = workerData;

  try {
    await limiter.schedule(url, () => backup(providerName, owner, repo, url, lfs));

    if (parentPort) {
      parentPort.postMessage({ status: 'done', providerName, owner, repo });
    }
  } catch (err) {
    console.error(`[error] ${providerName}/${owner}/${repo}: ${err.message}`);
    if (parentPort) {
      parentPort.postMessage({ status: 'error', providerName, owner, repo, error: err.message });
    }
  }
}

run();
