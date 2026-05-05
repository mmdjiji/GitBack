const { createScheduler, collectRepos } = require('./scheduler');
const { limiter } = require('./limiter');
const { backup } = require('./backup');
const { load } = require('./config');

async function main() {
  const config = load();
  console.log(`[gitback] Loaded config with ${config.providers.length} provider(s)`);
  console.log(`[gitback] Cron schedule: ${config.cron}`);

  // Run an immediate backup on startup
  console.log('[gitback] Running initial backup...');
  await runBackup();

  // Start the cron scheduler
  const bree = createScheduler();
  await bree.start();
  console.log('[gitback] Scheduler started, waiting for next cron trigger...');

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[gitback] Shutting down...');
    await bree.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[gitback] Shutting down...');
    await bree.stop();
    process.exit(0);
  });
}

async function runBackup() {
  try {
    const repos = await collectRepos();
    console.log(`[gitback] Total repos to backup: ${repos.length}`);

    const promises = repos.map((task) =>
      limiter.schedule(task.url, () =>
        backup(task.providerName, task.owner, task.repo, task.url, task.lfs, task.description)
      ).catch((err) => {
        console.error(`[backup-error] ${task.providerName}/${task.owner}/${task.repo}: ${err.message}`);
      })
    );

    await Promise.all(promises);
    console.log('[gitback] Initial backup complete');
  } catch (err) {
    console.error(`[gitback] Backup error: ${err.message}`);
  }
}

main().catch((err) => {
  console.error(`[gitback] Fatal: ${err.message}`);
  process.exit(1);
});
