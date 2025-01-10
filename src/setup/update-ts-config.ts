import fs from 'node:fs';
import path from 'node:path';

import getPackageBaseUrl from '../config/get-package-base-url';
import getPluginsConfig from '../config/get-plugins-config';
import getSelfRoot from '../config/get-self-root';

let tsConfigCache = '';

/**
 * Update the tsconfig.json file with the plugin paths
 * @returns {void}
 */
const updateTsConfig = (): void => {
  const selfRoot = getSelfRoot();

  const selfBaseUrl = getPackageBaseUrl(selfRoot);
  const selfBaseUrlPath = path.join(selfRoot, selfBaseUrl);
  const pluginsConfig = getPluginsConfig(path.join(selfRoot, selfBaseUrl));

  const selfTsConfigFile = path.join(selfRoot, 'tsconfig.json');
  const sourceTsConfigFile = path.join(selfRoot, 'tsconfig.source.json');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const selfTsConfig = JSON.parse(fs.readFileSync(sourceTsConfigFile, 'utf-8'));

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  selfTsConfig.compilerOptions.paths = Object.keys(pluginsConfig).reduce<Record<string, string[]>>(
    (acc, key) => {
      const relativePath = path
        .relative(selfBaseUrlPath, pluginsConfig[key].srcPath)
        .replace(/\\/g, '/');

      acc[`${key}/*`] = [`${relativePath}/*`];

      return acc;
    },
    {},
  );

  const pluginizrPath = path
    .relative(selfBaseUrlPath, path.join(selfRoot, 'pluginizr'))
    .replace(/\\/g, '/');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  selfTsConfig.compilerOptions.paths['~/pluginizr-loader/*'] = [`${pluginizrPath}/*`];

  const selfTsConfigString = JSON.stringify(selfTsConfig, null, 2);

  if (tsConfigCache !== selfTsConfigString) {
    fs.writeFileSync(selfTsConfigFile, selfTsConfigString);
  }

  tsConfigCache = selfTsConfigString;
};

export default updateTsConfig;
