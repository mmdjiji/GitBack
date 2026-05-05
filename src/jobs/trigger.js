/**
 * Trigger job - runs on cron schedule.
 * Collects repos from all providers and dispatches backup tasks.
 */
const { parentPort } = require('worker_threads');
const { collectRepos } = require('../scheduler');
const { limiter } = require('../limiter');
const { backup } = require('../backup');

async function run() {
  console.log(`[trigger] Starting backup at ${new Date().toISOString()}`);

  try {
    const repos = await collectRepos();
    console.log(`[trigger] Total repos to backup: ${repos.length}`);

    // Dispatch all backups through the limiter
    const promises = repos.map((task) =>
      limiter.schedule(task.url, () =>
        backup(task.providerName, task.owner, task.repo, task.url, task.lfs, task.description)
      ).catch((err) => {
        console.error(`[backup-error] ${task.providerName}/${task.owner}/${task.repo}: ${err.message}`);
      })
    );

    await Promise.all(promises);
    console.log(`[trigger] Backup complete at ${new Date().toISOString()}`);
  } catch (err) {
    console.error(`[trigger] Fatal error: ${err.message}`);
  }

  if (parentPort) {
    parentPort.postMessage('done');
  }
}

run();
