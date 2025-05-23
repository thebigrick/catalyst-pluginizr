import path from 'node:path';
import fs from 'node:fs';
import * as glob from 'glob';
import crypto from 'node:crypto';

interface AppDirPlugin {
  hash: string;
  resourceId: string;
  pluginizrResourceId: string;
  pluginizrProxyFile: string;
  coreProxyFile: string;
}

const globExclusionList = ['**/node_modules/**', '**/dist/**', '**/build/**'];

/**
 * Generates a hash for the appdir proxy based on the plugin path
 * @param {string} pluginPath - The path to the plugin
 * @return {string} The generated hash
 */
const generateAppdirProxyHash = (pluginPath: string): string => {
  return `plugin_${crypto.createHash('sha256').update(pluginPath).digest('hex').slice(0, 8)}`;
};

/**
 * Generates a resource ID for the appdir plugin based on the file path
 * @param {string} filePath - The path to the file
 * @return {string} The generated resource ID
 */
const getResourceId = (filePath: string): string => {
  const packageJsonPath = getModuleConfigByAppdirFile(filePath);
  const packageDir = path.dirname(packageJsonPath);

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const packageName = packageJson.name;

  if (!packageName) {
    throw new Error(`Package name not found in ${packageJsonPath}`);
  }

  const tsconfigPath = path.join(packageDir, 'tsconfig.json');
  let baseDir = '.';

  if (fs.existsSync(tsconfigPath)) {
    try {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      if (tsconfig.compilerOptions) {
        baseDir = tsconfig.compilerOptions.baseUrl || tsconfig.compilerOptions.rootDir || '.';
      }
    } catch (error) {
      console.warn(`Failed to parse tsconfig.json: ${error}`);
    }
  }

  const fullBaseDir = path.join(packageDir, baseDir);
  let relativePath = path.relative(fullBaseDir, filePath);

  relativePath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');

  relativePath = relativePath.split(path.sep).join('/');

  return `${packageName}/${relativePath}`;
};

/**
 * Retrieves all appdir plugins from the specified directory
 * @return {Record<string, AppDirPlugin>} An object containing appdir plugins
 */
const getAppdirPlugins = (): Record<string, AppDirPlugin> => {
  const pluginsBasePath = path.resolve(__dirname, '../../../../plugins');
  const appDirPlugins = glob.sync('**/appdir/**/*.{ts,tsx,js,jsx}', {
    cwd: pluginsBasePath,
    ignore: globExclusionList,
    absolute: true,
  });

  return appDirPlugins.reduce<Record<string, AppDirPlugin>>((acc, filePath) => {
    const hash = generateAppdirProxyHash(filePath);
    const pluginizrProxyFile = `${hash}.ts`;
    const relativePath = path
      .relative(pluginsBasePath, filePath)
      .replace(/\\/g, '/')
      .split('/')
      .slice(3);

    const fileName = relativePath.pop() || '';
    const coreProxyFile = `app/${relativePath.join('/')}/(pluginizr)/${fileName}`;

    const resourceId = getResourceId(filePath);
    const pluginizrResourceId = `@thebigrick/catalyst-pluginizr/generated/appdir/${hash}`;

    acc[hash] = {
      hash,
      resourceId,
      pluginizrResourceId,
      pluginizrProxyFile,
      coreProxyFile,
    };

    return acc;
  }, {});
};

/**
 * Gets the module configuration file (package.json) for a given file path
 * @param {string} filePath - The path to the file
 * @return {string} The path to the module configuration file
 * @throws {Error} If the package.json file is not found
 */
const getModuleConfigByAppdirFile = (filePath: string): string => {
  let currentDir = path.dirname(filePath);
  const rootDir = path.parse(currentDir).root;

  while (currentDir !== rootDir) {
    const packageJsonPath = path.join(currentDir, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      return packageJsonPath;
    }

    currentDir = path.dirname(currentDir);
  }

  const rootPackageJson = path.join(rootDir, 'package.json');
  if (fs.existsSync(rootPackageJson)) {
    return rootPackageJson;
  }

  throw new Error(`Could not find package.json for file: ${filePath}`);
};

/**
 * Generates the content for the appdir plugin proxy file
 * @param {AppDirPlugin} plugin - The appdir plugin object
 * @return {string} The generated file content
 */
const getAppdirPluginContent = (plugin: AppDirPlugin): { pluginizr: string; core: string } => {
  const pluginizr = `/* eslint-disable */
// Generated file for ${plugin.resourceId}
// DO NOT EDIT MANUALLY

export * from '${plugin.resourceId}';
export { default } from '${plugin.resourceId}';
`;

  const core = `/* eslint-disable */
// Generated file for ${plugin.resourceId}
// DO NOT EDIT MANUALLY

export * from '${plugin.pluginizrResourceId}';
export { default } from '${plugin.pluginizrResourceId}';
`;

  return { pluginizr, core };
};

/**
 * Generates proxy files for appdir plugins
 * @returns {void}
 */
const generateAppdirProxies = (): void => {
  const generatedDir = path.resolve(__dirname, '../generated/appdir');
  const corePath = path.resolve(__dirname, '../../../../core');

  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  // Collect valid files
  const validPluginizrFiles = [];
  const validCoreFiles = [];

  const appDirFiles = getAppdirPlugins();
  for (const plugin of Object.values(appDirFiles)) {
    const content = getAppdirPluginContent(plugin);

    // Write the pluginizr proxy file
    const pluginizrProxyFullPath = path.join(generatedDir, plugin.pluginizrProxyFile);
    validPluginizrFiles.push(pluginizrProxyFullPath);
    fs.writeFileSync(pluginizrProxyFullPath, content.pluginizr, 'utf-8');

    // Write the core proxy file
    const coreProxyFullPath = path.join(corePath, plugin.coreProxyFile);
    validCoreFiles.push(coreProxyFullPath);
    const coreDir = path.dirname(coreProxyFullPath);
    if (!fs.existsSync(coreDir)) {
      fs.mkdirSync(coreDir, { recursive: true });
    }
    fs.writeFileSync(coreProxyFullPath, content.core, 'utf-8');
  }

  // Collect old files
  const oldPluginizrFiles = glob.sync('**/*.ts', {
    cwd: generatedDir,
    ignore: globExclusionList,
    absolute: true,
  });
  const oldCoreFiles = glob.sync('**/(pluginizr)/*.{ts,tsx}', {
    cwd: corePath,
    ignore: globExclusionList,
    absolute: true,
  });

  for (const file of oldPluginizrFiles) {
    if (!validPluginizrFiles.includes(file)) {
      fs.unlinkSync(file);
    }
  }

  for (const file of oldCoreFiles) {
    if (!validCoreFiles.includes(file)) {
      fs.unlinkSync(file);

      // Remove empty pluginizr directories
      const coreDir = path.dirname(file);
      const filesInDir = fs.readdirSync(coreDir);
      if (filesInDir.length === 0) {
        fs.rmdirSync(coreDir);
      }
    }
  }
};

export default generateAppdirProxies;
