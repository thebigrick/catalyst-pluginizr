import { defineConfig, Options } from 'tsup';

export default defineConfig((options: Options) => ({
  entry: ['src/generated/*.ts'],
  format: ['esm'],
  outDir: 'dist/generated',
  dts: {
    only: false,
  },
  clean: !options.watch,
  sourcemap: true,
  ...options,
}));
