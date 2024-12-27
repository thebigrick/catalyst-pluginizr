const pluginizr = require('./pluginizr');

/**
 * Webpack loader that wraps exported items with appropriate plugins.
 * Functions and React components are handled as before.
 * Non-function exports (classes, arrays, objects, strings, numbers, etc.) are also wrapped with withPluginsFn.
 * @param {string} inputCode - The source code to transform.
 * @returns {Promise<void>} The transformed code.
 */
async function loader(inputCode) {
  const callback = this.async();

  try {
    if (
      inputCode.search(/^['"]use\s*no-plugins['"]\s*;?\s*$/) !== -1 ||
      this.resourcePath.replace(/\\/g, '/').includes('/node_modules/') ||
      this.resourcePath.endsWith('.d.ts') ||
      this.resourcePath.replace(/\\/g, '/').includes('/packages/catalyst-pluginizr/')
    ) {
      callback(null, inputCode);

      return;
    }

    const result = pluginizr(inputCode, this.resourcePath, this);

    callback(null, result);
  } catch (error) {
    callback(error);
  }
}

module.exports = loader;
