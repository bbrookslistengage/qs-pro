import { AppError, ErrorCode } from '@qpp/backend-shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { validateRequiredConfig } from './validate-config';

describe('validateRequiredConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('does not throw when all required config is present and valid', () => {
    process.env.SESSION_SECRET = 'test-secret';
    process.env.SESSION_COOKIE_NAME = 'test-cookie';
    process.env.ENCRYPTION_KEY = 'test-key';
    process.env.SESSION_MAX_AGE = '3600';

    expect(() => validateRequiredConfig()).not.toThrow();
  });

  it('throws CONFIG_ERROR when SESSION_SECRET is missing', () => {
    process.env.SESSION_COOKIE_NAME = 'test-cookie';
    process.env.ENCRYPTION_KEY = 'test-key';
    process.env.SESSION_MAX_AGE = '3600';
    delete process.env.SESSION_SECRET;

    expect(() => validateRequiredConfig()).toThrow(AppError);
    try {
      validateRequiredConfig();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe(ErrorCode.CONFIG_ERROR);
      expect((error as AppError).context?.statusMessage).toContain(
        'SESSION_SECRET',
      );
    }
  });

  it('throws CONFIG_ERROR when SESSION_MAX_AGE is not a valid number', () => {
    process.env.SESSION_SECRET = 'test-secret';
    process.env.SESSION_COOKIE_NAME = 'test-cookie';
    process.env.ENCRYPTION_KEY = 'test-key';
    process.env.SESSION_MAX_AGE = 'not-a-number';

    expect(() => validateRequiredConfig()).toThrow(AppError);
    try {
      validateRequiredConfig();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe(ErrorCode.CONFIG_ERROR);
    }
  });

  it('collects multiple missing config errors', () => {
    delete process.env.SESSION_SECRET;
    delete process.env.SESSION_COOKIE_NAME;
    delete process.env.ENCRYPTION_KEY;
    delete process.env.SESSION_MAX_AGE;

    try {
      validateRequiredConfig();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appError = error as AppError;
      // All 4 missing configs are joined in statusMessage
      expect(appError.context?.statusMessage).toContain('SESSION_SECRET');
      expect(appError.context?.statusMessage).toContain('SESSION_COOKIE_NAME');
      expect(appError.context?.statusMessage).toContain('ENCRYPTION_KEY');
      expect(appError.context?.statusMessage).toContain('SESSION_MAX_AGE');
    }
  });
});
