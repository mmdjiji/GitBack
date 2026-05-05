const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Minimal HTTP JSON client for API calls.
 */
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'gitback/1.0',
        ...options.headers,
      },
    };

    const req = mod.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          return;
        }
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Paginated fetch - supports both per_page (GitHub/GitLab) and page_size (CNB) params.
 */
async function fetchAllPages(baseUrl, options = {}, opts = {}) {
  const {
    pageParam = 'page',
    sizeParam = 'per_page',
    perPage = 100,
  } = opts;

  const results = [];
  let page = 1;

  while (true) {
    const sep = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${sep}${pageParam}=${page}&${sizeParam}=${perPage}`;
    const res = await request(url, options);

    if (!Array.isArray(res.data) || res.data.length === 0) break;
    results.push(...res.data);

    if (res.data.length < perPage) break;
    page++;
  }

  return results;
}

module.exports = { request, fetchAllPages };
