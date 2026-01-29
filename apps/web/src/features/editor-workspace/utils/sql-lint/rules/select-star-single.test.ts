import { describe, expect, it } from "vitest";

import type { LintContext } from "../types";
import { selectStarSingleRule } from "./select-star-single";

const createContext = (sql: string): LintContext => ({ sql, tokens: [] });

describe("selectStarSingleRule", () => {
  describe("warning detection", () => {
    it("warns on SELECT * for single-table queries", () => {
      const diagnostics = selectStarSingleRule.check(
        createContext("SELECT * FROM [A]"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("warning");
      expect(diagnostics[0]?.message).toContain("SELECT *");
    });

    it("warns on SELECT * with double-quoted table name", () => {
      const diagnostics = selectStarSingleRule.check(
        createContext('SELECT * FROM "TableName"'),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("warning");
    });

    it("warns on multiple SELECT * in single query", () => {
      const sql =
        "SELECT * FROM (SELECT * FROM [A]) AS sub UNION SELECT * FROM [B]";
      const diagnostics = selectStarSingleRule.check(createContext(sql));

      expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("JOIN exclusion", () => {
    it("does not warn on SELECT * when JOIN is present", () => {
      const diagnostics = selectStarSingleRule.check(
        createContext("SELECT * FROM [A] a JOIN [B] b ON a.Id = b.Id"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("does not warn on SELECT * when LEFT JOIN is present", () => {
      const diagnostics = selectStarSingleRule.check(
        createContext("SELECT * FROM [A] LEFT JOIN [B] ON [A].Id = [B].Id"),
      );

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("string literal handling", () => {
    it("does not match * inside single-quoted string", () => {
      const diagnostics = selectStarSingleRule.check(
        createContext("SELECT 'SELECT * FROM' AS val FROM [A]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("handles escaped single quotes in string literals", () => {
      const diagnostics = selectStarSingleRule.check(
        createContext("SELECT 'It''s a SELECT * test' FROM [A]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("does not match * inside double-quoted identifier", () => {
      const diagnostics = selectStarSingleRule.check(
        createContext('SELECT "*" FROM [A]'),
      );

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("bracketed identifier handling", () => {
    it("does not match * inside bracketed identifier", () => {
      const diagnostics = selectStarSingleRule.check(
        createContext("SELECT [*] FROM [A]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("warns on SELECT * with bracketed table", () => {
      const diagnostics = selectStarSingleRule.check(
        createContext("SELECT * FROM [My Table]"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("warning");
    });
  });

  describe("comment handling", () => {
    it("does not warn on SELECT * in line comment", () => {
      const diagnostics = selectStarSingleRule.check(
        createContext("SELECT Id FROM [A] -- SELECT * FROM [B]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("does not warn on SELECT * in block comment", () => {
      const diagnostics = selectStarSingleRule.check(
        createContext("SELECT Id FROM [A] /* SELECT * FROM [B] */"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("handles newline after line comment correctly", () => {
      const sql = `SELECT Id FROM [A] -- comment
SELECT * FROM [B]`;
      const diagnostics = selectStarSingleRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("warning");
    });

    it("warns on SELECT * after block comment", () => {
      const diagnostics = selectStarSingleRule.check(
        createContext("/* comment */ SELECT * FROM [A]"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("warning");
    });
  });

  describe("edge cases", () => {
    it("does not flag * when part of block comment end", () => {
      const diagnostics = selectStarSingleRule.check(
        createContext("SELECT /* comment */ id FROM [A]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("does not flag multiplication operator", () => {
      const diagnostics = selectStarSingleRule.check(
        createContext("SELECT price * quantity AS total FROM [A]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("handles whitespace between SELECT and *", () => {
      const diagnostics = selectStarSingleRule.check(
        createContext("SELECT   *   FROM [A]"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("warning");
    });
  });
});
