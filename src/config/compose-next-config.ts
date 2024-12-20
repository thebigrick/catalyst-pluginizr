import fs from 'fs';
import { NextConfig } from 'next';

import { NextConfigWrapper } from '../types';

import { PluginConfig } from './get-plugins-config';

/**
 * Composes multiple Next.js config wrappers into a single config
 * @param {Record<string, PluginConfig>} pluginsConfig Record of plugin configurations
 * @param {NextConfig} baseConfig Base Next.js configuration
 * @returns {NextConfig} A function that applies all config wrappers in sequence
 */
const composeNextConfig = (
  pluginsConfig: Record<string, PluginConfig>,
  baseConfig: NextConfig = {},
): NextConfig => {
  try {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const wrappers = Object.values(pluginsConfig)
      .filter((pluginConfig) => {
        const wrapperPath = `${pluginConfig.pluginPath}/next.wrapper.cjs`;

        return fs.existsSync(wrapperPath);
      })
      .map((pluginConfig) => {
        console.log(`Importing config wrapper from ${pluginConfig.packageName}`);

        try {
          const wrapperPath = `${pluginConfig.pluginPath}/next.wrapper.cjs`;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-require-imports,import/no-dynamic-require
          const wrapper = require(wrapperPath);

          if (typeof wrapper !== 'function') {
            console.warn(`Invalid wrapper in ${wrapperPath}: expected a function`);

            return null;
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return wrapper;
        } catch (error) {
          console.warn(`Failed to import config wrapper from ${pluginConfig.packageName}:`, error);

          return null;
        }
      })
      .filter((wrapper) => wrapper !== null) as NextConfigWrapper[];

    if (wrappers.length === 0) {
      return baseConfig;
    }

    return wrappers.reduceRight(
      (acc: NextConfig, wrapper: NextConfigWrapper) => wrapper(acc),
      baseConfig,
    );
  } catch (error) {
    console.error('Error composing Next.js config:', error);

    return baseConfig;
  }
};

export default composeNextConfig;
