import crypto from 'node:crypto';

/**
 * Create a safe hashed name for a module
 * @param {string} module - The module name to hash
 * @returns {string} A hashed string prefixed with 'plugin_'
 */
export const getPluginHash = (module: string): string => {
  return `plugin_${crypto.createHash('sha256').update(module).digest('hex').slice(0, 8)}`;
};
