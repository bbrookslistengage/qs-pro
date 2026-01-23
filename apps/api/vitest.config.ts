import swc from 'unplugin-swc';
import { defineConfig, mergeConfig } from 'vitest/config';

import sharedConfig from '../../vitest.shared';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'api',
      include: [
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
        'test/**/*.spec.ts',
        'test/**/*.test.ts',
      ],
      exclude: ['**/*.e2e-spec.ts', '**/*.e2e.test.ts', 'node_modules/**'],
      root: './',
    },
    plugins: [
      swc.vite({
        module: { type: 'es6' },
      }),
    ],
  }),
);
