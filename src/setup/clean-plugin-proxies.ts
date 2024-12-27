import fs from 'node:fs';
import path from 'node:path';

/**
 * Cleans up generated plugin files from the "generated" directory
 * @returns {void}
 */
const cleanPluginProxies = (): void => {
  const generatedDir = path.resolve(__dirname, '../generated');

  if (!fs.existsSync(generatedDir)) {
    throw new Error('Generated directory does not exist');
  }

  const files = fs.readdirSync(generatedDir);

  files.forEach((file) => {
    if (file.startsWith('plugin_') && file.endsWith('.ts')) {
      const filePath = path.join(generatedDir, file);

      fs.unlinkSync(filePath);
      console.log(`Deleted proxy file: ${file}`);
    }
  });
};

export default cleanPluginProxies;
