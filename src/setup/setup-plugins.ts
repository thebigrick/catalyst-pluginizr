import registerPlugins from './register-plugins';
import updateTsConfig from './update-ts-config';

/**
 * Apply configuration for plugins
 * @returns {void}
 */
const setupPlugins = (): void => {
  updateTsConfig();
  registerPlugins();
};

export default setupPlugins;
