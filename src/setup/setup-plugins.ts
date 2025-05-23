import generatePluginProxies from './generate-plugin-proxies';
import updateTsConfig from './update-ts-config';
import generateAppdirProxies from './generate-appdir-proxies';

/**
 * Apply configuration for plugins
 * @returns {void}
 */
const setupPlugins = (): void => {
  updateTsConfig();
  generatePluginProxies();
  generateAppdirProxies();
};

export default setupPlugins;
