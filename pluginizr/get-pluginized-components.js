const glob = require('glob');
const fs = require('node:fs');
const path = require('node:path');

const { getPluginHash } = require('./get-plugin-hash');

let pluginizedComponents;

/**
 * Clears the cached pluginized components
 * @returns {void}
 */
const clearPluginizedComponents = () => {
  pluginizedComponents = undefined;
};

/**
 * Safely reads and parses a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {Object|null} Parsed JSON content or null if error
 */
const readJsonFile = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);

    return null;
  }
};

/**
 * Gets package name and tsconfig baseUrl for a module
 * @param {string} moduleDir - Module directory path
 * @returns {Object} Module configuration
 */
const getModuleConfig = (moduleDir) => {
  const packageJson = readJsonFile(path.join(moduleDir, '../../package.json'));
  const tsconfig = readJsonFile(path.join(moduleDir, '../../tsconfig.json'));

  return {
    packageName: packageJson?.name,
    baseUrl: tsconfig?.compilerOptions?.baseUrl || '.',
  };
};

/**
 * Gets normalized plugin path relative to module directory
 * @param {string} file - Plugin file path
 * @param {string} moduleDir - Module directory path
 * @returns {string} Normalized plugin path
 */
const getPluginPath = (file, moduleDir) => {
  const relativePath = path.relative(moduleDir, file);

  return relativePath.replace(/\\/g, '/').replace(/\.[^/.]+$/, '');
};

/**
 * Maps pluginized components to their plugin implementations
 * @returns {Object.<string, string[]>} Map of component IDs to array of plugin paths
 */
const getPluginizedComponents = () => {
  if (true || !pluginizedComponents) {
    const searchPackageRegex = /resourceId:\s*['"](?<package>.+)['"]/m;
    const startPath = path.resolve(__dirname, '../../../plugins');
    const pluginMap = new Map();

    const pluginFiles = glob.sync('**/plugins/*.{ts,tsx,js,jsx}', {
      cwd: startPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      absolute: true,
    });

    pluginFiles.forEach((file) => {
      try {
        const moduleDir = path.dirname(file);
        const { packageName } = getModuleConfig(moduleDir);

        if (!packageName) return;

        const content = fs.readFileSync(file, 'utf-8');
        const match = content.match(searchPackageRegex);

        const resourceId = match.groups.package;
        const pluginPath = getPluginPath(file, moduleDir);
        const pluginId = `${packageName}/plugins/${pluginPath}`;

        if (!pluginMap.has(resourceId)) {
          pluginMap.set(resourceId, {
            hash: getPluginHash(resourceId),
            plugins: [],
          });
        }

        pluginMap.get(resourceId).plugins.push({
          id: pluginId,
          path: file,
        });
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    });

    pluginizedComponents = Object.fromEntries(pluginMap);
  }

  return pluginizedComponents;
};

module.exports = { getPluginizedComponents, clearPluginizedComponents };
