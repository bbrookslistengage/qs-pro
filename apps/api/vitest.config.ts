import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    environment: 'node',
  },
  plugins: [
    // This is required to support NestJS decorators and metadata in Vitest
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
