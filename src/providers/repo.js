const { URL } = require('url');

/**
 * Repo provider - uses direct URLs from include list.
 * No API calls, no authentication (public repos).
 */
async function listRepos(provider) {
  const results = [];

  for (const repoUrl of provider.include) {
    const url = repoUrl.replace(/\/$/, '');

    // Extract owner/repo from URL path
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    // Use hostname as "owner" prefix for URL-based repos
    // e.g. https://git.zx2c4.com/cgit/ -> owner: "git.zx2c4.com", repo: "cgit"
    const owner = parsed.hostname;
    const repo = pathParts[pathParts.length - 1] || 'unknown';

    results.push({ url, owner, repo, lfs: false });
  }

  return results;
}

module.exports = { listRepos };
