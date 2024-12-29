import { glob } from 'glob';
import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getPluginHash } from './get-plugin-hash';

interface PackageJson {
  [key: string]: unknown;
  name?: string;
}

interface TsConfig {
  [key: string]: unknown;
  compilerOptions?: {
    [key: string]: unknown;
    baseUrl?: string;
  };
}

export interface ModuleConfig {
  packageName: string | undefined;
  baseUrl: string;
}

export interface PluginInfo {
  id: string;
  path: string;
}

export interface PluginMapValue {
  hash: string;
  plugins: PluginInfo[];
}

type PluginizedComponents = Record<string, PluginMapValue>;

let pluginizedComponents: PluginizedComponents | undefined;

/**
 * Clears the cached pluginized components
 * @returns {void}
 */
export const clearPluginizedComponents = (): void => {
  pluginizedComponents = undefined;
};

/**
 * Safely reads and parses a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns Parsed JSON content or null if error
 * @template T
 * @returns {T | null}
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
const readJsonFile = <T>(filePath: string): T | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);

    return null;
  }
};

/**
 * Gets package name and tsconfig baseUrl for a module
 * @param {string} moduleDir - Module directory path
 * @returns {ModuleConfig} Module configuration
 */
const getModuleConfig = (moduleDir: string): ModuleConfig => {
  const packageJson = readJsonFile<PackageJson>(path.join(moduleDir, '../../package.json'));
  const tsconfig = readJsonFile<TsConfig>(path.join(moduleDir, '../../tsconfig.json'));

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
const getPluginPath = (file: string, moduleDir: string): string => {
  const relativePath = path.relative(moduleDir, file);

  return relativePath.replace(/\\/g, '/').replace(/\.[^/.]+$/, '');
};

/**
 * Maps pluginized components to their plugin implementations
 * @returns {PluginizedComponents} Map of component IDs to array of plugin paths
 */
export const getPluginizedComponents = (): PluginizedComponents => {
  if (true || !pluginizedComponents) {
    const selfDir = dirname(fileURLToPath(import.meta.url));
    const searchPackageRegex = /resourceId:\s*['"](?<package>.+)['"]/m;
    const startPath = path.resolve(selfDir, '../../../../plugins');
    const pluginMap = new Map<string, PluginMapValue>();

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
        const match = searchPackageRegex.exec(content);

        if (!match?.groups?.package) return;

        const resourceId = match.groups.package;
        const pluginPath = getPluginPath(file, moduleDir);
        const pluginId = `${packageName}/plugins/${pluginPath}`;

        if (!pluginMap.has(resourceId)) {
          pluginMap.set(resourceId, {
            hash: getPluginHash(resourceId),
            plugins: [],
          });
        }

        const pluginData = pluginMap.get(resourceId);

        if (pluginData) {
          pluginData.plugins.push({
            id: pluginId,
            path: file,
          });
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    });

    pluginizedComponents = Object.fromEntries(pluginMap);
  }

  return pluginizedComponents;
};
