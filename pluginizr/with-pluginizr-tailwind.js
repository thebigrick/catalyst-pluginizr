const withPluginizrTailwind = (tailwindConfig = {}) => {
  return {
    ...tailwindConfig,
    content: [...(tailwindConfig.content || []), '../plugins/**/*.{ts,tsx}'],
  };
};

module.exports = withPluginizrTailwind;
