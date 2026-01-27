/**
 * HTTP Retry Utility Unit Tests
 *
 * Tests the retry delay calculation and Retry-After header parsing.
 */
import { describe, expect, it, vi } from "vitest";

import { AppError, ErrorCode } from "../../common/errors";
import {
  calculateRetryDelay,
  parseRetryAfter,
  withRetry,
} from "../http-retry.util";

describe("HTTP Retry Utility", () => {
  describe("calculateRetryDelay", () => {
    it("returns exponentially increasing delays for attempts", () => {
      // Capture multiple samples to account for jitter
      const samples = 10;
      const attempt0Delays: number[] = [];
      const attempt1Delays: number[] = [];
      const attempt2Delays: number[] = [];

      for (let i = 0; i < samples; i++) {
        attempt0Delays.push(calculateRetryDelay(0));
        attempt1Delays.push(calculateRetryDelay(1));
        attempt2Delays.push(calculateRetryDelay(2));
      }

      // Attempt 0: base 1000ms, jitter range means 800-1200ms
      const avgAttempt0 = attempt0Delays.reduce((a, b) => a + b, 0) / samples;
      expect(avgAttempt0).toBeGreaterThan(700);
      expect(avgAttempt0).toBeLessThan(1300);

      // Attempt 1: base 2000ms, jitter range means 1600-2400ms
      const avgAttempt1 = attempt1Delays.reduce((a, b) => a + b, 0) / samples;
      expect(avgAttempt1).toBeGreaterThan(1400);
      expect(avgAttempt1).toBeLessThan(2600);

      // Attempt 2: base 4000ms, jitter range means 3200-4800ms
      const avgAttempt2 = attempt2Delays.reduce((a, b) => a + b, 0) / samples;
      expect(avgAttempt2).toBeGreaterThan(2800);
      expect(avgAttempt2).toBeLessThan(5200);
    });

    it("respects Retry-After seconds when provided", () => {
      const delay = calculateRetryDelay(0, 5);
      expect(delay).toBe(5000); // 5 seconds * 1000
    });

    it("ignores Retry-After if zero or negative", () => {
      const delayZero = calculateRetryDelay(0, 0);
      const delayNegative = calculateRetryDelay(0, -1);

      // Should fall back to exponential backoff (~1000ms with jitter)
      expect(delayZero).toBeGreaterThan(700);
      expect(delayZero).toBeLessThan(1300);
      expect(delayNegative).toBeGreaterThan(700);
      expect(delayNegative).toBeLessThan(1300);
    });

    it("applies jitter - results vary between calls", () => {
      const delays = new Set<number>();
      for (let i = 0; i < 20; i++) {
        delays.add(calculateRetryDelay(0));
      }
      // With jitter, we should get multiple unique values
      expect(delays.size).toBeGreaterThan(5);
    });

    it("caps delay at maxDelayMs", () => {
      // Attempt 10 would be 1000 * 2^10 = 1,024,000ms without cap
      const delay = calculateRetryDelay(10);
      // With default maxDelayMs=8000 and jitter, should be 6400-9600
      expect(delay).toBeLessThanOrEqual(9600);
    });

    it("respects custom config values", () => {
      const delay = calculateRetryDelay(0, undefined, {
        baseDelayMs: 500,
        jitterRange: 0, // No jitter for predictable test
      });
      expect(delay).toBe(500);
    });
  });

  describe("parseRetryAfter", () => {
    it("returns undefined for non-AppError", () => {
      const result = parseRetryAfter(new Error("generic error"));
      expect(result).toBeUndefined();
    });

    it("returns undefined for AppError without cause", () => {
      const error = new AppError(ErrorCode.MCE_RATE_LIMITED);
      const result = parseRetryAfter(error);
      expect(result).toBeUndefined();
    });

    it("returns undefined for AppError without response headers", () => {
      const error = new AppError(ErrorCode.MCE_RATE_LIMITED, {
        response: {},
      });
      const result = parseRetryAfter(error);
      expect(result).toBeUndefined();
    });

    it("extracts numeric seconds from Retry-After header", () => {
      const error = new AppError(ErrorCode.MCE_RATE_LIMITED, {
        response: {
          headers: {
            "retry-after": "30",
          },
        },
      });
      const result = parseRetryAfter(error);
      expect(result).toBe(30);
    });

    it("extracts HTTP-date format from Retry-After header", () => {
      // Set up a date 60 seconds in the future
      const futureDate = new Date(Date.now() + 60_000);
      const httpDate = futureDate.toUTCString();

      const error = new AppError(ErrorCode.MCE_RATE_LIMITED, {
        response: {
          headers: {
            "retry-after": httpDate,
          },
        },
      });

      const result = parseRetryAfter(error);
      // Should be approximately 60 seconds (allow for test execution time)
      expect(result).toBeGreaterThan(55);
      expect(result).toBeLessThanOrEqual(61);
    });

    it("returns undefined for past HTTP-date", () => {
      const pastDate = new Date(Date.now() - 60_000);
      const httpDate = pastDate.toUTCString();

      const error = new AppError(ErrorCode.MCE_RATE_LIMITED, {
        response: {
          headers: {
            "retry-after": httpDate,
          },
        },
      });

      const result = parseRetryAfter(error);
      expect(result).toBeUndefined();
    });

    it("returns undefined for invalid Retry-After value", () => {
      const error = new AppError(ErrorCode.MCE_RATE_LIMITED, {
        response: {
          headers: {
            "retry-after": "invalid-value",
          },
        },
      });

      const result = parseRetryAfter(error);
      expect(result).toBeUndefined();
    });
  });

  describe("withRetry", () => {
    // Use very small delays for fast tests (no fake timers to avoid unhandled rejection issues)
    const fastConfig = { baseDelayMs: 1, maxDelayMs: 10, jitterRange: 0 };

    it("returns result on first success", async () => {
      const fn = vi.fn().mockResolvedValue("success");

      const result = await withRetry(fn, fastConfig);

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("throws non-retryable errors immediately", async () => {
      const error = new AppError(ErrorCode.MCE_BAD_REQUEST);
      const fn = vi.fn().mockRejectedValue(error);

      await expect(withRetry(fn, fastConfig)).rejects.toThrow(error);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retries on retryable error and succeeds", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new AppError(ErrorCode.MCE_RATE_LIMITED))
        .mockResolvedValue("success");

      const result = await withRetry(fn, fastConfig);
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("throws after max retries exhausted", async () => {
      const error = new AppError(ErrorCode.MCE_SERVER_ERROR);
      const fn = vi.fn().mockRejectedValue(error);

      await expect(
        withRetry(fn, { ...fastConfig, maxRetries: 2 }),
      ).rejects.toThrow(error);
      // 1 initial + 2 retries = 3 total calls
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("respects custom maxRetries config", async () => {
      const error = new AppError(ErrorCode.MCE_RATE_LIMITED);
      const fn = vi.fn().mockRejectedValue(error);

      await expect(
        withRetry(fn, { ...fastConfig, maxRetries: 1 }),
      ).rejects.toThrow(error);
      // 1 initial + 1 retry = 2 total calls
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("classifies MCE_RATE_LIMITED as retryable", async () => {
      const error = new AppError(ErrorCode.MCE_RATE_LIMITED);
      const fn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue("success");

      const result = await withRetry(fn, fastConfig);
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("classifies MCE_SERVER_ERROR as retryable", async () => {
      const error = new AppError(ErrorCode.MCE_SERVER_ERROR);
      const fn = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue("success");

      const result = await withRetry(fn, fastConfig);
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("does NOT retry MCE_FORBIDDEN", async () => {
      const error = new AppError(ErrorCode.MCE_FORBIDDEN);
      const fn = vi.fn().mockRejectedValue(error);

      await expect(withRetry(fn, fastConfig)).rejects.toThrow(error);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("does NOT retry MCE_BAD_REQUEST", async () => {
      const error = new AppError(ErrorCode.MCE_BAD_REQUEST);
      const fn = vi.fn().mockRejectedValue(error);

      await expect(withRetry(fn, fastConfig)).rejects.toThrow(error);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
