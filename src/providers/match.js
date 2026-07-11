/**
 * Shared repo-path matching helpers for provider exclude/lfs config.
 *
 * A pattern matches a repo path when any of the following holds:
 *   - exact match:        pattern === "org/sub/repo"
 *   - path prefix:        pattern === "org"        matches "org/sub/repo"
 *   - glob wildcard "*":  matches everything
 *
 * Matching is anchored at the start of the path and compared segment by
 * segment, so "b" matches "b" and "b/..." but NOT "a/b/c", and "lake" does
 * not match "lakebi" (only whole path segments count).
 */
function matchesPattern(fullPath, pattern) {
  if (pattern === '*') return true;
  if (fullPath === pattern) return true;

  const pathSegs = fullPath.split('/');
  const patSegs = pattern.split('/');

  // Pattern must be a leading (prefix) run of the path's segments.
  if (patSegs.length > pathSegs.length) return false;
  return patSegs.every((seg, i) => seg === pathSegs[i]);
}

/**
 * True if fullPath is excluded by any pattern in the list.
 */
function isExcluded(fullPath, patterns) {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some((p) => matchesPattern(fullPath, p));
}

/**
 * True if fullPath should have LFS fetched, per the lfs pattern list.
 */
function matchesLfs(lfsConfig, fullPath) {
  if (!lfsConfig || lfsConfig.length === 0) return false;
  return lfsConfig.some((p) => matchesPattern(fullPath, p));
}

module.exports = { matchesPattern, isExcluded, matchesLfs };
