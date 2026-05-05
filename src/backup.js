const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const REPOS_DIR = process.env.REPOS_DIR || path.resolve(__dirname, '..', 'repos');
const MAX_RETRIES = 3;
const RETRY_DELAYS = [10000, 30000, 60000]; // 10s, 30s, 60s

/**
 * Backup a single repository using git CLI.
 * - First run: bare clone
 * - Subsequent runs: fetch all refs
 * - If lfs enabled: fetch all LFS objects
 *
 * @param {string} providerName - Config key name (e.g. "github", "cnb")
 * @param {string} owner - Owner/namespace
 * @param {string} repo - Repository name
 * @param {string} url - Authenticated clone URL
 * @param {boolean} fetchLfs - Whether to fetch LFS objects
 */
async function backup(providerName, owner, repo, url, fetchLfs, description) {
  const repoPath = path.join(REPOS_DIR, providerName, owner, repo);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (fs.existsSync(path.join(repoPath, 'HEAD'))) {
        fetchRepo(repoPath, url);
      } else {
        cloneRepo(url, repoPath);
      }

      if (description) {
        setDescription(repoPath, description);
      }

      if (fetchLfs) {
        fetchLfsObjects(repoPath, url);
      }

      return repoPath;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt];
        console.warn(`[retry] ${providerName}/${owner}/${repo} attempt ${attempt + 1} failed: ${err.message}, retrying in ${delay / 1000}s...`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cloneRepo(url, destPath) {
  fs.mkdirSync(destPath, { recursive: true });

  // Remove the dir we just created - git clone --bare will create it
  fs.rmSync(destPath, { recursive: true });

  const safeUrl = sanitizeUrlForLog(url);
  console.log(`[clone] ${safeUrl} -> ${destPath}`);

  execSync(`git clone --bare --mirror "${url}" "${destPath}"`, {
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 600000, // 10 min
  });
}

function fetchRepo(repoPath, url) {
  const safeUrl = sanitizeUrlForLog(url);
  console.log(`[fetch] ${safeUrl}`);

  // Update remote URL (in case token changed)
  try {
    execSync(`git -C "${repoPath}" remote set-url origin "${url}"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    // Ignore
  }

  execSync(`git -C "${repoPath}" fetch --prune --force origin "+refs/*:refs/*"`, {
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 600000,
  });
}

function setDescription(repoPath, description) {
  const descFile = path.join(repoPath, 'description');
  fs.writeFileSync(descFile, description, 'utf8');
}

function fetchLfsObjects(repoPath, url) {
  try {
    console.log(`[lfs] ${repoPath}`);

    // Set LFS url for bare repo
    execSync(`git -C "${repoPath}" config lfs.url "${url}/info/lfs"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Fetch all LFS objects
    execSync(`git -C "${repoPath}" lfs fetch --all origin`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 1800000, // 30 min for LFS
    });
  } catch (err) {
    console.error(`[lfs-error] ${repoPath}: ${err.message}`);
  }
}

function sanitizeUrlForLog(url) {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

module.exports = { backup, REPOS_DIR };
