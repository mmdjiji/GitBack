const github = require('./github');
const gitlab = require('./gitlab');
const cnb = require('./cnb');
const repo = require('./repo');

const PROVIDERS = {
  github,
  gitlab,
  cnb,
  repo,
};

/**
 * Get the provider module for a given type.
 */
function getProvider(type) {
  const provider = PROVIDERS[type];
  if (!provider) {
    throw new Error(`Unknown provider type: ${type}`);
  }
  return provider;
}

module.exports = { getProvider };
