import path from 'node:path';
import fs from 'node:fs';

/**
 * Get the package name from a plugin folder
 * @param {string} pluginFolder
 * @returns {string}
 */
const getPackageName = (pluginFolder: string): string => {
  const packageJsonFile = path.join(pluginFolder, "package.json");

  if (!fs.existsSync(packageJsonFile)) {
    throw new Error(`Plugin ${pluginFolder} does not have a package.json file`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const json = JSON.parse(fs.readFileSync(packageJsonFile, "utf-8"));

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!json.name) {
    throw new Error(
      `Plugin ${pluginFolder} does not have a name in its package.json file`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return
  return json.name;
};

export default getPackageName;
