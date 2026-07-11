const { fetchAllPages } = require('../http');
const { isExcluded, matchesLfs } = require('./match');

const DEFAULT_API = 'https://api.github.com';

/**
 * GitHub provider - fetches repo list and returns normalized URLs.
 * Returns: [{ url: "https://oauth2:token@github.com/owner/repo.git", owner, repo }]
 */
async function listRepos(provider) {
  const apiBase = provider.url || DEFAULT_API;
  const token = provider.accessToken;
  const headers = {
    'Authorization': `Bearer ${token}`,
  };

  const repos = new Map(); // full_name -> repo data

  // Owned repos
  if (provider.owned) {
    const data = await fetchAllPages(`${apiBase}/user/repos?affiliation=owner`, { headers });
    for (const r of data) {
      repos.set(r.full_name, r);
    }
  }

  // Starred repos
  if (provider.starred) {
    const data = await fetchAllPages(`${apiBase}/user/starred`, { headers });
    for (const r of data) {
      repos.set(r.full_name, r);
    }
  }

  // Collaborator repos
  if (provider.collaborator) {
    const data = await fetchAllPages(`${apiBase}/user/repos?affiliation=collaborator`, { headers });
    for (const r of data) {
      repos.set(r.full_name, r);
    }
  }

  // Org member repos
  if (provider.orgMember) {
    const data = await fetchAllPages(`${apiBase}/user/repos?affiliation=organization_member`, { headers });
    for (const r of data) {
      repos.set(r.full_name, r);
    }
  }

  // Filter excludes
  const excludePatterns = provider.exclude;

  const results = [];
  for (const [fullName, repoData] of repos) {
    const [owner, repo] = fullName.split('/');

    // Check exclude: match full_name or owner (path prefix)
    if (isExcluded(fullName, excludePatterns)) continue;

    // Build authenticated URL
    const url = buildAuthUrl(repoData.clone_url, token);

    // Check LFS eligibility
    const lfs = shouldFetchLfs(provider.lfs, fullName);

    results.push({ url, owner, repo, lfs, description: repoData.description || '' });
  }

  return results;
}

function buildAuthUrl(cloneUrl, token) {
  const parsed = new URL(cloneUrl);
  parsed.username = 'oauth2';
  parsed.password = token;
  return parsed.toString();
}

function shouldFetchLfs(lfsConfig, fullName) {
  return matchesLfs(lfsConfig, fullName);
}

module.exports = { listRepos };
