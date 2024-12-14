import { watch } from 'chokidar';
import path from 'node:path';

import getPluginsBasePath from '../config/get-plugins-base-path';
import setupPlugins from '../setup/setup-plugins';

const watchFiles = ['package.json', 'tsconfig.json', 'register-plugins.ts'];

/**
 * Run the development environment
 * @returns {void}
 */
const runDev = (): void => {
  setupPlugins();

  const targetFolder = getPluginsBasePath();
  const watchPatterns = [
    targetFolder,
    ...watchFiles.map((file) => path.join(targetFolder, '**', file)),
  ];

  const watcher = watch(watchPatterns, {
    persistent: true,
    ignoreInitial: true,
    ignored: /node_modules/,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });

  watcher
    .on('add', (file: string) => {
      const fileName = path.basename(file);

      if (watchFiles.includes(fileName)) {
        setupPlugins();
      }
    })
    .on('change', (file: string) => {
      const fileName = path.basename(file);

      if (watchFiles.includes(fileName)) {
        setupPlugins();
      }
    })
    .on('unlink', (file: string) => {
      const fileName = path.basename(file);

      if (watchFiles.includes(fileName)) {
        setupPlugins();
      }
    });

  process.on('SIGINT', () => {
    watcher
      .close()
      .then(() => {
        process.exit(0);
      })
      .catch(() => {
        process.exit(1);
      });
  });
};

runDev();
