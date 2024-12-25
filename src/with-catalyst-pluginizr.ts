/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call */
/* eslint-disable no-param-reassign */

import { NextConfig } from 'next';
import { WebpackConfigContext } from 'next/dist/server/config-shared';
import path from 'node:path';

import composeNextConfig from './config/compose-next-config';
import getCatalystBasePath from './config/get-catalyst-base-path';
import getCoreBasePath from './config/get-core-base-path';
import getPluginsConfig from './config/get-plugins-config';
import getSelfRoot from './config/get-self-root';

/**
 * Enhance the Next.js configuration with Catalyst plugins support
 * @param {NextConfig} nextConfig
 * @returns {NextConfig}
 */
const withCatalystPluginizr = (nextConfig: NextConfig): NextConfig => {
  const basePath = nextConfig.basePath || '';
  const pluginsConfig = getPluginsConfig(basePath);

  const mapping = Object.values(pluginsConfig).reduce((acc, pluginConfig) => {
    return {
      ...acc,
      [pluginConfig.packageName]: pluginConfig.srcPath,
    };
  }, {});

  const pluginPackages = Object.keys(pluginsConfig);

  if (nextConfig.experimental?.turbo) {
    console.log(
      'Using Catalyst pluginizr by TheBigRick <riccardo.tempesta@bigcommerce.com> [turbo-mode]',
    );

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const tsLoaders = (nextConfig.experimental.turbo.rules?.['./**/*.ts'] as any)?.loaders || [];
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const tsxLoaders = (nextConfig.experimental.turbo.rules?.['./**/*.tsx'] as any)?.loaders || [];

    tsLoaders.push(path.resolve(getSelfRoot(), 'pluginizr/loader.js'));
    tsxLoaders.push(path.resolve(getSelfRoot(), 'pluginizr/loader.js'));

    return composeNextConfig(pluginsConfig, {
      ...nextConfig,
      experimental: {
        ...nextConfig.experimental,
        turbo: {
          ...nextConfig.experimental.turbo,
          rules: {
            ...nextConfig.experimental.turbo.rules,
            './**/*.tsx': {
              loaders: tsxLoaders,
            },
            './**/*.ts': {
              loaders: tsLoaders,
            },
          },
        },
      },
    });
  }

  console.log('Using Catalyst pluginizr by TheBigRick <riccardo.tempesta@bigcommerce.com>');

  return composeNextConfig(pluginsConfig, {
    ...nextConfig,
    transpilePackages: [...(nextConfig.transpilePackages || []), ...pluginPackages],
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

      // config.plugins.push(
      //   new context.webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
      //     resource.request = resource.request.replace(/^node:/, '');
      //   }),
      // );

      return config;
    },
  });
};

export default withCatalystPluginizr;
