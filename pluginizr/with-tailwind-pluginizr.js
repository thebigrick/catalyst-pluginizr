const withTailwindPluginizr = (tailwindConfig = {}) => {
  return {
    ...tailwindConfig,
    content: [
      ...(tailwindConfig.content || []),
      '../plugins/**/*.{ts,tsx,css,scss}',
      '!../plugins/**/node_modules/**',
    ],
  };
};

module.exports = withTailwindPluginizr;
