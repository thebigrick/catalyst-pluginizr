import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Get the root of the package
 * @returns {string}
 */
const getSelfRoot = (): string => {
  const selfDir = dirname(fileURLToPath(import.meta.url));

  return path.resolve(path.join(selfDir, '../..').replace(/\\/g, '/'));
};

export default getSelfRoot;
