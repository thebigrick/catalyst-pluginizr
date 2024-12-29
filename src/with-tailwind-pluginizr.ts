import type { Config } from 'tailwindcss';

/**
 * Extends a Tailwind configuration to include plugin paths in content
 * @param {Partial<Config>} tailwindConfig - The base Tailwind configuration
 * @returns {Partial<Config>} Enhanced Tailwind configuration with plugin paths
 */
const withPluginizrTailwind = (tailwindConfig: Partial<Config> = {}): Partial<Config> => {
  return {
    ...tailwindConfig,
    // @ts-expect-error - We're extending the content property
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    content: [...(tailwindConfig.content || []), '../plugins/**/*.{ts,tsx}'],
  };
};

export default withPluginizrTailwind;
