import fs from 'node:fs';
import path from 'node:path';

import getCoreBasePath from '../config/get-core-base-path';
import getPackageBaseUrl from '../config/get-package-base-url';
import getPluginsConfig from '../config/get-plugins-config';

/**
 * Update the tsconfig.json file with the plugin paths
 * @returns {void}
 */
const updateTsConfig = (): void => {
  const coreRoot = getCoreBasePath();

  const coreBaseUrl = getPackageBaseUrl(coreRoot);
  const coreBaseUrlPath = path.join(coreRoot, coreBaseUrl);
  const pluginsConfig = getPluginsConfig(path.join(coreRoot, coreBaseUrl));

  const coreTsConfigFile = path.join(coreRoot, 'tsconfig.json');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const coreTsConfig = JSON.parse(fs.readFileSync(coreTsConfigFile, 'utf-8'));

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  coreTsConfig.compilerOptions.paths = Object.keys(pluginsConfig).reduce<Record<string, string[]>>(
    (acc, key) => {
      const relativePath = path
        .relative(coreBaseUrlPath, pluginsConfig[key].srcPath)
        .replace(/\\/g, '/');

      acc[`${key}/*`] = [`${relativePath}/*`];

      return acc;
    },
    {},
  );

  fs.writeFileSync(coreTsConfigFile, JSON.stringify(coreTsConfig, null, 2));
};

export default updateTsConfig;
