import { defineConfig } from 'vitest/config';

/**
 * Root Vitest configuration for coverage settings.
 *
 * Tests are executed via pnpm recursive commands (`pnpm test`), where each
 * workspace package runs its own vitest.config.ts that extends vitest.shared.ts.
 * This root config is used when running vitest directly from the root for
 * coverage aggregation.
 *
 * Recommended test commands:
 *   pnpm test              - Run all tests (recursive, each package uses its own config)
 *   pnpm --filter api test - Run API tests only
 *   pnpm --filter @qpp/web test - Run web tests only
 *
 * Coverage:
 *   pnpm test:coverage     - Run all tests with coverage aggregation
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['apps/*/src/**', 'packages/*/src/**'],
      exclude: [
        '**/*.test.ts',
        '**/__tests__/**',
        '**/test/**',
        '**/node_modules/**',
        '**/dist/**',
      ],
      reporter: ['text', 'json', 'json-summary', 'html'],
      reportsDirectory: './coverage',
    },
    reporters: ['default'],
  },
});
