const { fetchAllPages } = require('../http');

const DEFAULT_API = 'https://api.cnb.cool';
const DEFAULT_CLONE_HOST = 'cnb.cool';

/**
 * CNB provider - fetches repo list and returns normalized URLs.
 * API base: https://api.cnb.cool
 * Clone URL: https://cnb:<token>@cnb.cool/<path>.git
 * Auth: Bearer token
 */
async function listRepos(provider) {
  const apiBase = provider.url ? provider.url.replace(/\/$/, '') : DEFAULT_API;
  const token = provider.accessToken;
  const headers = {
    'Authorization': `Bearer ${token}`,
  };

  const repos = new Map(); // path -> repo data

  const pageOpts = { pageParam: 'page', sizeParam: 'page_size', perPage: 50 };

  // Owned repos
  if (provider.owned) {
    const data = await fetchAllPages(`${apiBase}/user/repos`, { headers }, pageOpts);
    for (const r of data) {
      if (r.path) {
        repos.set(r.path, r);
      }
    }
  }

  // Starred repos
  if (provider.starred) {
    try {
      const data = await fetchAllPages(`${apiBase}/user/starred`, { headers }, pageOpts);
      for (const r of data) {
        if (r.path) {
          repos.set(r.path, r);
        }
      }
    } catch {
      // starred endpoint may not be available with all token scopes
    }
  }

  // Member repos - fetch repos from each group
  if (provider.member) {
    try {
      const groups = await fetchAllPages(`${apiBase}/user/groups`, { headers }, pageOpts);
      for (const group of groups) {
        if (!group.path) continue;
        try {
          const groupRepos = await fetchAllPages(
            `${apiBase}/groups/${group.path}/repos`,
            { headers },
            pageOpts
          );
          for (const r of groupRepos) {
            if (r.path) {
              repos.set(r.path, r);
            }
          }
        } catch {
          // skip groups we can't access
        }
      }
    } catch {
      // groups endpoint may not be available
    }
  }

  // Filter excludes
  const excludeSet = new Set(provider.exclude);

  // Determine clone host from apiBase
  let cloneHost = DEFAULT_CLONE_HOST;
  try {
    const parsed = new URL(apiBase);
    // api.cnb.cool -> cnb.cool
    cloneHost = parsed.hostname.replace(/^api\./, '');
  } catch {}

  const results = [];
  for (const [fullPath, repoData] of repos) {
    // Skip secret repos (cannot be cloned)
    if (repoData.visibility_level === 'Secret') continue;

    const parts = fullPath.split('/');
    const repo = parts.pop();
    const owner = parts.join('/');

    if (excludeSet.has(fullPath) || excludeSet.has(owner)) continue;

    const url = `https://cnb:${token}@${cloneHost}/${fullPath}.git`;
    const lfs = shouldFetchLfs(provider.lfs, fullPath, owner);

    results.push({ url, owner, repo, lfs, description: repoData.description || '' });
  }

  return results;
}

function shouldFetchLfs(lfsConfig, fullPath, owner) {
  if (!lfsConfig || lfsConfig.length === 0) return false;
  if (lfsConfig.includes('*')) return true;
  if (lfsConfig.includes(fullPath)) return true;
  if (lfsConfig.includes(owner)) return true;
  return false;
}

module.exports = { listRepos };
