import { describe, expect, it } from "vitest";

import type { LintContext } from "../types";
import { unmatchedDelimitersRule } from "./unmatched-delimiters";

const createContext = (sql: string): LintContext => ({ sql, tokens: [] });

describe("unmatchedDelimitersRule", () => {
  describe("brackets", () => {
    it("flags unclosed brackets", () => {
      const diagnostics = unmatchedDelimitersRule.check(
        createContext("SELECT * FROM [A"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain("Unclosed bracket");
    });

    it("does not flag balanced brackets", () => {
      const diagnostics = unmatchedDelimitersRule.check(
        createContext("SELECT * FROM [A]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("flags extra closing bracket", () => {
      const diagnostics = unmatchedDelimitersRule.check(
        createContext("SELECT * FROM [A]]"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain("Unmatched closing bracket");
    });
  });

  describe("parentheses", () => {
    it("handles nested parentheses all matched", () => {
      const diagnostics = unmatchedDelimitersRule.check(
        createContext("SELECT CONCAT(UPPER(LEFT([A], 1)), '.')"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("flags deeply nested unmatched parentheses", () => {
      const diagnostics = unmatchedDelimitersRule.check(
        createContext("SELECT CONCAT((LEFT([A], 1)"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain("Unclosed parenthesis");
    });

    it("flags extra closing parenthesis", () => {
      const diagnostics = unmatchedDelimitersRule.check(
        createContext("SELECT (1 + 2))"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain(
        "Unmatched closing parenthesis",
      );
    });

    it("flags unclosed parenthesis with nested brackets", () => {
      const diagnostics = unmatchedDelimitersRule.check(
        createContext("SELECT * FROM ([A]"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain("Unclosed parenthesis");
    });
  });

  describe("mixed delimiters", () => {
    it("handles mixed bracket types valid", () => {
      const diagnostics = unmatchedDelimitersRule.check(
        createContext("SELECT [Field] FROM (SELECT * FROM [A]) sub"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("ignores brackets inside string literals", () => {
      const diagnostics = unmatchedDelimitersRule.check(
        createContext("SELECT '(' AS OpenParen FROM [A]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("handles deeply nested parentheses with mixed quotes", () => {
      const diagnostics = unmatchedDelimitersRule.check(
        createContext("SELECT CONCAT((UPPER(LEFT([Name], 1))), '''s value')"),
      );

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("quotes", () => {
    it("flags unclosed single quote at EOF", () => {
      const diagnostics = unmatchedDelimitersRule.check(
        createContext("SELECT 'unclosed"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain("Unclosed single quote");
    });

    it("handles escaped quotes in strings", () => {
      const diagnostics = unmatchedDelimitersRule.check(
        createContext("SELECT 'It''s' FROM [A]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("handles double-quoted identifiers", () => {
      const diagnostics = unmatchedDelimitersRule.check(
        createContext('SELECT "Column Name" FROM [A]'),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("ignores delimiters inside double-quoted identifiers", () => {
      const diagnostics = unmatchedDelimitersRule.check(
        createContext('SELECT "(weird)" FROM [A]'),
      );

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("comments", () => {
    it("ignores delimiters inside block comments", () => {
      const diagnostics = unmatchedDelimitersRule.check(
        createContext("SELECT * /* ( */ FROM [A]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("ignores delimiters inside line comments", () => {
      const diagnostics = unmatchedDelimitersRule.check(
        createContext("SELECT * FROM [A] -- ("),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("resumes parsing after line comment ends", () => {
      const sql = `SELECT * FROM [A] -- comment with (
WHERE [B] = 1`;
      const diagnostics = unmatchedDelimitersRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("resumes parsing after block comment ends", () => {
      const diagnostics = unmatchedDelimitersRule.check(
        createContext("SELECT /* ( */ (1 + 2) FROM [A]"),
      );

      expect(diagnostics).toHaveLength(0);
    });
  });
});
