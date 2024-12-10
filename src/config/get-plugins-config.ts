import fs from 'node:fs';
import path from 'node:path';

import getPackageBaseUrl from '../config/get-package-base-url';
import getPackageName from '../config/get-package-name';
import getPluginsBasePath from '../config/get-plugins-base-path';

export interface PluginConfig {
  pluginPath: string;
  packageName: string;
  srcPath: string;
}

/**
 * Get the plugin path map by scanning the plugins folder
 * @param {string} relativeTo
 * @returns {Record<string, string>}
 */
const getPluginsConfig = (relativeTo: string): Record<string, PluginConfig> => {
  const plugins: Record<string, PluginConfig> = {};

  const pluginsFullPath = getPluginsBasePath();
  const pluginFolders = fs.readdirSync(pluginsFullPath);

  // eslint-disable-next-line no-restricted-syntax
  for (const pluginFolder of pluginFolders) {
    const pluginPath = path.join(pluginsFullPath, pluginFolder);

    try {
      const packageName = getPackageName(path.join(pluginPath));
      const tsConfigBaseUrl = getPackageBaseUrl(pluginPath);

      const relativeSrcPath = path
        .resolve(relativeTo, path.join(pluginsFullPath, pluginFolder, tsConfigBaseUrl))
        .replace(/\\/g, '/');

      const relativePluginPath = path
        .resolve(relativeTo, path.join(pluginsFullPath, pluginFolder))
        .replace(/\\/g, '/');

      plugins[packageName] = {
        pluginPath: relativePluginPath,
        packageName,
        srcPath: relativeSrcPath,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      /* empty */
    }
  }

  return plugins;
};

export default getPluginsConfig;
