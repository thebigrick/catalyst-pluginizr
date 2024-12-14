const fs = require('node:fs');
const path = require('node:path');

let pluginizedComponents;

/**
 * Extracts module paths from files in the given directory and its subdirectories
 * Used only for build time to reduce the HOC fingerprinting overhead
 * @returns {string[]} Array of found module paths
 */
const getPluginizedComponents = () => {
  if (!pluginizedComponents) {
    const searchFileExtensions = ['.js', '.jsx', '.ts', '.tsx'];
    const searchPackageRegex =
      /(?<!import[^\n]*)['"](?<package>@bigcommerce\/catalyst-core\/.+?)['"]/g;

    const startPath = path.resolve(__dirname, '../../../plugins');

    console.log('   Searching plugins in:', startPath);

    const modulePaths = new Set();

    const scanDirectory = (dirPath) => {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        // eslint-disable-next-line no-restricted-syntax
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.name === 'node_modules') {
            // eslint-disable-next-line no-continue
            continue;
          }

          if (entry.isDirectory()) {
            scanDirectory(fullPath);
          } else if (entry.isFile() && searchFileExtensions.includes(path.extname(entry.name))) {
            const content = fs.readFileSync(fullPath, 'utf-8');

            // Search for module paths using regular expressions
            const match = content.matchAll(searchPackageRegex);

            if (match) {
              // eslint-disable-next-line no-restricted-syntax
              for (const m of match) {
                console.log('   Found plugin for:', m.groups.package);
                modulePaths.add(m.groups.package);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${dirPath}:`, error);
      }
    };

    scanDirectory(startPath);

    pluginizedComponents = Array.from(modulePaths);
  }

  return pluginizedComponents;
};

module.exports = getPluginizedComponents;
