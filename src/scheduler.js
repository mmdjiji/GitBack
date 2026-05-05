/**
 * Scheduler - uses Bree to schedule the backup cron job.
 * On each cron trigger, it fetches repo lists from all providers
 * and dispatches backup jobs to Bree workers.
 */
const path = require('path');
const Bree = require('bree');
const { load } = require('./config');
const { getProvider } = require('./providers');

async function collectRepos() {
  const config = load();
  const allRepos = [];

  for (const provider of config.providers) {
    try {
      const mod = getProvider(provider.type);
      const repos = await mod.listRepos(provider);

      for (const repo of repos) {
        allRepos.push({
          providerName: provider.name,
          owner: repo.owner,
          repo: repo.repo,
          url: repo.url,
          lfs: repo.lfs,
          description: repo.description,
        });
      }

      console.log(`[provider:${provider.name}] Found ${repos.length} repos`);
    } catch (err) {
      console.error(`[provider:${provider.name}] Error: ${err.message}`);
    }
  }

  return allRepos;
}

function createScheduler() {
  const config = load();

  const bree = new Bree({
    root: path.join(__dirname, 'jobs'),
    jobs: [
      {
        name: 'trigger',
        cron: config.cron,
        path: path.join(__dirname, 'jobs', 'trigger.js'),
      },
    ],
    errorHandler: (error, workerMetadata) => {
      console.error(`[bree] Worker error:`, error.message);
    },
  });

  return bree;
}

module.exports = { createScheduler, collectRepos };
