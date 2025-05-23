import { watch } from 'chokidar';

import getPluginsBasePath from '../config/get-plugins-base-path';
import setupPlugins from '../setup/setup-plugins';

/**
 * Run the development environment
 * @returns {void}
 */
const runDev = (): void => {
  setupPlugins();

  const targetFolder = getPluginsBasePath();

  const watcher = watch([targetFolder], {
    persistent: true,
    ignoreInitial: true,
    ignored: [/[/\\](\.git|dist|build|\.next|\.turbo|node_modules)[/\\]?/],
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });

  const isPluginFile = (file: string): boolean => {
    return (
      /\/plugins\/[^/]+\.tsx?/.exec(file.replace(/\\/g, '/')) !== null ||
      /\/appdir\/[^/]+\.tsx?/.exec(file.replace(/\\/g, '/')) !== null
    );
  };

  watcher
    .on('add', (file: string) => {
      if (!isPluginFile(file)) {
        return;
      }

      // console.log(`File ${file} has been added`);

      setupPlugins();
    })
    .on('change', (file: string) => {
      if (!isPluginFile(file)) {
        return;
      }

      // console.log(`File ${file} has been changed`);

      setupPlugins();
    })
    .on('unlink', (file: string) => {
      if (!isPluginFile(file)) {
        return;
      }

      // console.log(`File ${file} has been removed`);

      setupPlugins();
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
