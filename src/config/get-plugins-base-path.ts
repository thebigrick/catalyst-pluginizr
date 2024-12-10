import path from 'node:path';

/**
 * Get the plugins base path
 * @returns {string}
 */
const getPluginsBasePath = (): string => {
  return path.join(__dirname, '../../../..', 'plugins').replace(/\\/g, '/');
};

export default getPluginsBasePath;
