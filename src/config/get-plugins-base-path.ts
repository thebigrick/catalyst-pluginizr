import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Get the plugins base path
 * @returns {string}
 */
const getPluginsBasePath = (): string => {
  const selfDir = dirname(fileURLToPath(import.meta.url));

  return path.resolve(path.join(selfDir, '../../../..', 'plugins').replace(/\\/g, '/'));
};

export default getPluginsBasePath;
