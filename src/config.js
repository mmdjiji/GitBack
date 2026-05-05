const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CONFIG_PATH = process.env.CONFIG_PATH || path.resolve(__dirname, '..', 'config.yaml');

function load() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  const doc = yaml.load(raw);

  const config = {
    cron: doc.on && doc.on.cron ? doc.on.cron : '0 0 * * *',
    providers: [],
  };

  for (const [name, section] of Object.entries(doc)) {
    if (name === 'on') continue;
    if (!section || typeof section !== 'object') continue;

    const type = section.type;
    if (!type) continue;

    config.providers.push({
      name,
      type,
      accessToken: section.access_token || null,
      url: section.url || null,
      owned: section.owned !== false,
      starred: section.starred !== false,
      collaborator: section.collaborator !== false,
      orgMember: section.org_member !== false,
      member: section.member !== false,
      lfs: section.lfs || [],
      exclude: section.exclude || [],
      include: section.include || [],
    });
  }

  return config;
}

module.exports = { load, CONFIG_PATH };
