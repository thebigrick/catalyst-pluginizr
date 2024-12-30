const crypto = require('node:crypto');

/**
 * Create a safe hashed name for a module
 * @param {string} module
 * @returns {string}
 */
const getPluginHash = (module) => {
  return `plugin_${crypto.createHash('sha256').update(module).digest('hex').slice(0, 8)}`;
};

module.exports = { getPluginHash };
