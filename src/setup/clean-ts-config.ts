import fs from 'node:fs';
import path from 'node:path';

import getSelfRoot from '../config/get-self-root';

const cleanTsConfig = () => {
  const selfRoot = getSelfRoot();

  const selfTsConfigFile = path.join(selfRoot, 'tsconfig.json');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const selfTsConfig = JSON.parse(fs.readFileSync(selfTsConfigFile, 'utf-8'));

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  selfTsConfig.compilerOptions.paths = {};

  fs.writeFileSync(selfTsConfigFile, JSON.stringify(selfTsConfig, null, 2));
};

export default cleanTsConfig;
