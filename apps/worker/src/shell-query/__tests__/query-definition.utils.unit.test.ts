/**
 * Query Definition Utils Unit Tests
 *
 * Tests for buildQueryCustomerKey() which creates MCE Query Activity customer keys.
 * This is pure function testing - NO mocks needed.
 */
import { describe, expect, it } from "vitest";

import {
  buildQueryCustomerKey,
  MCE_CUSTOMER_KEY_MAX_LENGTH,
  QUERY_CUSTOMER_KEY_PREFIX,
} from "../query-definition.utils";

describe("buildQueryCustomerKey", () => {
  const maxIdLength =
    MCE_CUSTOMER_KEY_MAX_LENGTH - QUERY_CUSTOMER_KEY_PREFIX.length; // 26

  describe("prefix behavior", () => {
    it("should prefix userId with QPP_Query_", () => {
      const userId = "user123";

      const result = buildQueryCustomerKey(userId);

      expect(result).toBe(`${QUERY_CUSTOMER_KEY_PREFIX}${userId}`);
      expect(result).toBe("QPP_Query_user123");
    });
  });

  describe("truncation behavior", () => {
    it("should return full userId when shorter than max length", () => {
      const userId = "short-user-id";

      const result = buildQueryCustomerKey(userId);

      expect(result).toBe(`${QUERY_CUSTOMER_KEY_PREFIX}${userId}`);
      expect(result.length).toBeLessThan(MCE_CUSTOMER_KEY_MAX_LENGTH);
    });

    it("should return full userId when exactly at max length boundary", () => {
      const userId = "a".repeat(maxIdLength); // exactly 26 chars

      const result = buildQueryCustomerKey(userId);

      expect(result).toBe(`${QUERY_CUSTOMER_KEY_PREFIX}${userId}`);
      expect(result).toHaveLength(MCE_CUSTOMER_KEY_MAX_LENGTH);
    });

    it("should truncate userId when exceeding max length", () => {
      const longUserId = "a".repeat(50); // 50 chars, exceeds 26 char limit

      const result = buildQueryCustomerKey(longUserId);

      expect(result).toBe(
        `${QUERY_CUSTOMER_KEY_PREFIX}${"a".repeat(maxIdLength)}`,
      );
      expect(result).toHaveLength(MCE_CUSTOMER_KEY_MAX_LENGTH);
    });
  });

  describe("edge cases", () => {
    it("should return only prefix when userId is empty", () => {
      const result = buildQueryCustomerKey("");

      expect(result).toBe(QUERY_CUSTOMER_KEY_PREFIX);
      expect(result).toBe("QPP_Query_");
    });

    it("should handle special characters without transformation", () => {
      const userId = "user-123_test@example.com";

      const result = buildQueryCustomerKey(userId);

      expect(result).toBe(`${QUERY_CUSTOMER_KEY_PREFIX}${userId}`);
    });
  });

  describe("output length invariant", () => {
    it("should never exceed MCE_CUSTOMER_KEY_MAX_LENGTH (36 chars)", () => {
      const testCases = [
        "",
        "a",
        "short",
        "a".repeat(26),
        "a".repeat(50),
        "a".repeat(100),
        "uuid-12345678-1234-1234-1234-123456789012",
      ];

      for (const userId of testCases) {
        const result = buildQueryCustomerKey(userId);
        expect(result.length).toBeLessThanOrEqual(MCE_CUSTOMER_KEY_MAX_LENGTH);
      }
    });
  });
});
