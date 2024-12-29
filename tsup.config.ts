import { defineConfig, Options } from 'tsup';

export default defineConfig((options: Options) => ({
  entry: [
    'src/index.ts',
    'src/loader/loader.ts',
    'src/with-catalyst-pluginizr.ts',
    'src/with-tailwind-pluginizr.ts',
  ],
  format: ['esm'],
  dts: {
    only: false,
  },
  clean: !options.watch,
  sourcemap: true,
  ...options,
}));
