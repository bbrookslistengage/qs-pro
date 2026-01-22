import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.e2e-spec.ts'],
    globals: true,
    root: './',
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      LOG_FORMAT: 'text',
      PORT: '3000',
      SESSION_SECRET: 'test-session-secret-at-least-32-chars',
      SESSION_SALT: '1234567890123456',
      ENCRYPTION_KEY:
        '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
      MCE_CLIENT_ID: 'test-id',
      MCE_CLIENT_SECRET: 'test-secret',
      MCE_REDIRECT_URI: 'http://localhost/callback',
      MCE_JWT_SIGNING_SECRET: 'test-jwt-secret-at-least-32-chars-long',
      COOKIE_SECURE: 'true',
      COOKIE_SAMESITE: 'none',
      COOKIE_PARTITIONED: 'true',
    },
    server: {
      deps: {
        inline: ['@qpp/database'],
      },
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
