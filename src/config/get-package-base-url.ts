import fs from 'node:fs';
import path from 'node:path';

/**
 * Get the package base url from a plugin folder
 * @param {string} pluginFolder
 * @returns {string}
 */
const getPackageBaseUrl = (pluginFolder: string): string => {
  const tsConfigFile = path.join(pluginFolder, 'tsconfig.json');

  if (!fs.existsSync(tsConfigFile)) {
    throw new Error(`Plugin ${pluginFolder} does not have a tsconfig.json file`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const config = JSON.parse(fs.readFileSync(tsConfigFile, 'utf-8'));

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return
  return config.compilerOptions.baseUrl || '.';
};

export default getPackageBaseUrl;
