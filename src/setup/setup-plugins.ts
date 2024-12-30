import generatePluginProxies from './generate-plugin-proxies';
import updateTsConfig from './update-ts-config';

/**
 * Apply configuration for plugins
 * @returns {void}
 */
const setupPlugins = (): void => {
  updateTsConfig();
  generatePluginProxies();
};

export default setupPlugins;
