/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call */
/* eslint-disable no-param-reassign */

import { NextConfig } from 'next';
import { WebpackConfigContext } from 'next/dist/server/config-shared';
import path from 'node:path';

import composeNextConfig from './config/compose-next-config';
import getCatalystBasePath from './config/get-catalyst-base-path';
import getPluginsConfig, { PluginConfig } from './config/get-plugins-config';
import getSelfRoot from './config/get-self-root';

/**
 * Configure the Next.js configuration with Turbo loaders (experimental)
 */
const configureWithExperimentalTurbopack = (
  nextConfig: NextConfig,
  pluginsConfig: Record<string, PluginConfig>,
): NextConfig => {
  if (!nextConfig.experimental?.turbo) {
    throw new Error('Turbo mode is not enabled in the Next.js configuration');
  }

  console.log(
    'Using Catalyst pluginizr by TheBigRick <riccardo.tempesta@bigcommerce.com> [turbopack/experimental]',
  );

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const tsLoaders = (nextConfig.experimental.turbo.rules?.['./**/*.ts'] as any)?.loaders || [];
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const tsxLoaders = (nextConfig.experimental.turbo.rules?.['./**/*.tsx'] as any)?.loaders || [];

  tsLoaders.push(path.resolve(getSelfRoot(), 'pluginizr/loader.js'));
  tsxLoaders.push(path.resolve(getSelfRoot(), 'pluginizr/loader.js'));

  const rules = {
    ...nextConfig.experimental.turbo.rules,
    './**/*.tsx': {
      loaders: tsxLoaders,
    },
    './**/*.ts': {
      loaders: tsLoaders,
    },
  };

  return composeNextConfig(pluginsConfig, {
    ...nextConfig,
    experimental: {
      ...nextConfig.experimental,
      turbo: {
        ...nextConfig.experimental.turbo,
        rules,
      },
    },
  });
};

/**
 * Configure the Next.js configuration with Turbo loaders (experimental)
 */
const configureWithTurbopack = (
  nextConfig: NextConfig,
  pluginsConfig: Record<string, PluginConfig>,
): NextConfig => {
  if (!nextConfig.turbopack) {
    throw new Error('Turbo mode is not enabled in the Next.js configuration');
  }

  console.log(
    'Using Catalyst pluginizr by TheBigRick <riccardo.tempesta@bigcommerce.com> [turbopack]',
  );

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const tsLoaders = (nextConfig.turbopack.rules?.['./**/*.ts'] as any)?.loaders || [];
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const tsxLoaders = (nextConfig.turbopack.rules?.['./**/*.tsx'] as any)?.loaders || [];

  tsLoaders.push(path.resolve(getSelfRoot(), 'pluginizr/loader.js'));
  tsxLoaders.push(path.resolve(getSelfRoot(), 'pluginizr/loader.js'));

  const rules = {
    ...nextConfig.turbopack.rules,
    './**/*.tsx': {
      loaders: tsxLoaders,
    },
    './**/*.ts': {
      loaders: tsLoaders,
    },
  };

  return composeNextConfig(pluginsConfig, {
    ...nextConfig,
    turbopack: {
      ...nextConfig.turbopack,
      rules,
    },
  });
};

/**
 * Configure the Next.js configuration with Webpack loaders
 */
const configureWithWebpack = (
  nextConfig: NextConfig,
  pluginsConfig: Record<string, PluginConfig>,
): NextConfig => {
  console.log(
    'Using Catalyst pluginizr by TheBigRick <riccardo.tempesta@bigcommerce.com> [webpack]',
  );

  const mapping = Object.values(pluginsConfig).reduce((acc, pluginConfig) => {
    return {
      ...acc,
      [pluginConfig.packageName]: pluginConfig.srcPath,
    };
  }, {});

  return composeNextConfig(pluginsConfig, {
    ...nextConfig,
    // transpilePackages: [...(nextConfig.transpilePackages || []), ...pluginPackages],
    webpack: (config: any, context: WebpackConfigContext) => {
      if (typeof nextConfig.webpack === 'function') {
        config = nextConfig.webpack(config, context);
      }

      config.resolve.alias = {
        ...config.resolve.alias,
        ...mapping,
      };

      config.module.rules.unshift({
        test: /\.tsx?$/,
        include: [getCatalystBasePath()],
        exclude: [/node_modules/],
        use: [
          {
            loader: path.resolve(getSelfRoot(), 'pluginizr/loader.js'),
          },
        ],
        enforce: 'pre',
      });

      return config;
    },
  });
};

/**
 * Enhance the Next.js configuration with Catalyst plugins support
 * @param {NextConfig} nextConfig
 * @returns {NextConfig}
 */
const withCatalystPluginizr = (nextConfig: NextConfig): NextConfig => {
  const basePath = nextConfig.basePath || '';
  const pluginsConfig = getPluginsConfig(basePath);

  if (nextConfig.experimental?.turbo) {
    return configureWithExperimentalTurbopack(nextConfig, pluginsConfig);
  }

  if (nextConfig.turbopack) {
    return configureWithTurbopack(nextConfig, pluginsConfig);
  }

  return configureWithWebpack(nextConfig, pluginsConfig);
};

export default withCatalystPluginizr;
