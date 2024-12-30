const withTailwindPluginizr = (tailwindConfig = {}) => {
  return {
    ...tailwindConfig,
    content: [...(tailwindConfig.content || []), '../plugins/**/*.{ts,tsx}'],
  };
};

module.exports = withTailwindPluginizr;
