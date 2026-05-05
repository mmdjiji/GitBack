const { fetchAllPages } = require('../http');

const DEFAULT_API = 'https://gitlab.com';

/**
 * GitLab provider - fetches repo list and returns normalized URLs.
 */
async function listRepos(provider) {
  const apiBase = (provider.url || DEFAULT_API).replace(/\/$/, '');
  const token = provider.accessToken;
  const headers = {
    'PRIVATE-TOKEN': token,
  };

  const repos = new Map(); // path_with_namespace -> repo data

  // Owned repos
  if (provider.owned) {
    const data = await fetchAllPages(`${apiBase}/api/v4/projects?owned=true`, { headers });
    for (const r of data) {
      repos.set(r.path_with_namespace, r);
    }
  }

  // Starred repos
  if (provider.starred) {
    const data = await fetchAllPages(`${apiBase}/api/v4/projects?starred=true`, { headers });
    for (const r of data) {
      repos.set(r.path_with_namespace, r);
    }
  }

  // Member repos (teams)
  if (provider.member) {
    const data = await fetchAllPages(`${apiBase}/api/v4/projects?membership=true`, { headers });
    for (const r of data) {
      repos.set(r.path_with_namespace, r);
    }
  }

  // Filter excludes
  const excludeSet = new Set(provider.exclude);

  const results = [];
  for (const [fullPath, repoData] of repos) {
    const parts = fullPath.split('/');
    const repo = parts.pop();
    const owner = parts.join('/');

    if (excludeSet.has(fullPath) || excludeSet.has(owner)) continue;

    const url = buildAuthUrl(repoData.http_url_to_repo, token);
    const lfs = shouldFetchLfs(provider.lfs, fullPath, owner);

    results.push({ url, owner, repo, lfs, description: repoData.description || '' });
  }

  return results;
}

function buildAuthUrl(httpUrl, token) {
  const parsed = new URL(httpUrl);
  parsed.username = 'oauth2';
  parsed.password = token;
  return parsed.toString();
}

function shouldFetchLfs(lfsConfig, fullPath, owner) {
  if (!lfsConfig || lfsConfig.length === 0) return false;
  if (lfsConfig.includes('*')) return true;
  if (lfsConfig.includes(fullPath)) return true;
  if (lfsConfig.includes(owner)) return true;
  return false;
}

module.exports = { listRepos };
