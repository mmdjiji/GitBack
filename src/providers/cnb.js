const { fetchAllPages } = require('../http');
const { isExcluded, matchesLfs, matchesPattern } = require('./match');

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
    'Accept': 'application/vnd.cnb.api+json',
  };

  const repos = new Map(); // path -> repo data

  const pageOpts = { pageParam: 'page', sizeParam: 'page_size', perPage: 50 };

  // Owned + member repos: /user/repos returns everything the user can read
  // (both owned and group membership). role=Reporter is the minimum role that
  // grants read access — Guest cannot read code. Scope is controlled via
  // include/exclude.
  {
    const data = await fetchAllPages(`${apiBase}/user/repos?role=Reporter`, { headers }, pageOpts);
    for (const r of data) {
      if (r.path) {
        repos.set(r.path, r);
      }
    }
  }

  // Starred repos
  if (provider.starred) {
    try {
      const data = await fetchAllPages(`${apiBase}/user/stared-repos`, { headers }, pageOpts);
      for (const r of data) {
        if (r.path) {
          const existing = repos.get(r.path);
          // Mark as starred so the include whitelist doesn't filter it out.
          repos.set(r.path, Object.assign(existing || {}, r, { _starred: true }));
        }
      }
    } catch {
      // starred endpoint may not be available with all token scopes
    }
  }

  // Filter excludes / includes
  const excludePatterns = provider.exclude;
  const includePatterns = provider.include;
  const hasInclude = Array.isArray(includePatterns) && includePatterns.length > 0;

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

    // exclude takes priority: always drop excluded repos.
    if (isExcluded(fullPath, excludePatterns)) continue;

    // include whitelist: when set, only repos matching it are kept —
    // EXCEPT starred repos, which are always backed up regardless of include.
    if (hasInclude && !repoData._starred) {
      if (!includePatterns.some((p) => matchesPattern(fullPath, p))) continue;
    }

    const url = `https://cnb:${token}@${cloneHost}/${fullPath}.git`;
    const lfs = shouldFetchLfs(provider.lfs, fullPath, owner);

    results.push({ url, owner, repo, lfs, description: repoData.description || '' });
  }

  return results;
}

function shouldFetchLfs(lfsConfig, fullPath) {
  return matchesLfs(lfsConfig, fullPath);
}

module.exports = { listRepos };
