import cleanPluginsRegistry from '../setup/clean-plugins-registry';
import cleanTsConfig from '../setup/clean-ts-config';

export const clean = () => {
  cleanTsConfig();
  cleanPluginsRegistry();
};

clean();
