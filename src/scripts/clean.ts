import cleanPluginProxies from '../setup/clean-plugin-proxies';
import cleanTsConfig from '../setup/clean-ts-config';

export const clean = () => {
  cleanTsConfig();
  cleanPluginProxies();
};

clean();
