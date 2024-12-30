const withTailwindPluginizr = (tailwindConfig = {}) => {
  return {
    ...tailwindConfig,
    content: [
      ...(tailwindConfig.content || []),
      '../plugins/**/*.{ts,tsx}',
      '!../plugins/**/node_modules/**',
    ],
  };
};

module.exports = withTailwindPluginizr;
