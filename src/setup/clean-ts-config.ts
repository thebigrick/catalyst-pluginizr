import fs from 'node:fs';
import path from 'node:path';

import getPackageBaseUrl from '../config/get-package-base-url';
import getSelfRoot from '../config/get-self-root';

const cleanTsConfig = () => {
  const selfRoot = getSelfRoot();

  const selfBaseUrl = getPackageBaseUrl(selfRoot);
  const selfBaseUrlPath = path.join(selfRoot, selfBaseUrl);

  const selfTsConfigFile = path.join(selfRoot, 'tsconfig.json');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const selfTsConfig = JSON.parse(fs.readFileSync(selfTsConfigFile, 'utf-8'));

  const pluginizrPath = path
    .relative(selfBaseUrlPath, path.join(selfRoot, 'pluginizr'))
    .replace(/\\/g, '/');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  selfTsConfig.compilerOptions.paths = {
    '~/pluginizr-loader/*': [`${pluginizrPath}/*`],
  };

  fs.writeFileSync(selfTsConfigFile, JSON.stringify(selfTsConfig, null, 2));
};

export default cleanTsConfig;
