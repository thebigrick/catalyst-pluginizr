import fs from 'node:fs';
import path from 'node:path';

import { getPluginizedComponents } from '~/pluginizr-loader/get-pluginized-components';

interface PluginizedComponent {
  hash: string;
  plugins: Array<{ id: string; path: string }>;
}

// Cache for plugin content avoiding unnecessary file writes and loader invalidations
const pluginsContentCache: Record<string, string> = {};

/**
 * Creates the proxy file content with imports
 * @param {string} resourceId - The resource identifier
 * @param {string[]} pluginPaths - Array of plugin paths to import
 * @returns {string} Generated file content
 */
const createProxyContent = (resourceId: string, pluginPaths: string[]): string => {
  const imports = pluginPaths.map((p, index) => `import plugin${index} from '${p}';`).join('\n');

  return `/* eslint-disable */
// Generated file for ${resourceId}
// DO NOT EDIT MANUALLY

${imports}

export default [
  ${pluginPaths.map((_, index) => `plugin${index}`).join(',\n  ')}
];
`;
};

/**
 * Generates proxy files for all pluginized components
 * @returns {void}
 */
const generatePluginProxies = (): void => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const pluginizedComponents = getPluginizedComponents() as Record<string, PluginizedComponent>;

  const generatedDir = path.resolve(__dirname, '../generated/plugins');

  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  const existingPluginFiles = fs
    .readdirSync(generatedDir)
    .filter((f) => f.endsWith('.ts') && f.startsWith('plugin_'));
  const newFiles = Object.values(pluginizedComponents).map((p) => `${p.hash}.ts`);

  // Remove old files
  existingPluginFiles
    .filter((f) => !newFiles.includes(f))
    .forEach((f) => {
      fs.unlinkSync(path.join(generatedDir, f));

      console.log(`Removed old proxy file: ${f}`);
    });

  Object.entries(pluginizedComponents).forEach(([resourceId, pluginizedComponent]) => {
    const filename = `${pluginizedComponent.hash}.ts`;
    const filePath = path.join(generatedDir, filename);

    const pluginIds = pluginizedComponent.plugins.map((p) => p.id);
    const serializedIds = JSON.stringify(pluginIds);

    if (pluginsContentCache[resourceId] !== serializedIds || !fs.existsSync(filePath)) {
      const fileContent = createProxyContent(resourceId, pluginIds);

      fs.writeFileSync(filePath, fileContent, 'utf-8');

      if (!existingPluginFiles.includes(filename)) {
        console.log(`Generated proxy file for ${resourceId}: ${filename}`);
      }
    }

    pluginsContentCache[resourceId] = serializedIds;
  });
};

export default generatePluginProxies;
