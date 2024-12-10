import path from 'node:path';

/**
 * Get the root of the package
 * @returns {string}
 */
const getSelfRoot = (): string => {
  return path.join(__dirname, '../..').replace(/\\/g, '/');
};

export default getSelfRoot;
