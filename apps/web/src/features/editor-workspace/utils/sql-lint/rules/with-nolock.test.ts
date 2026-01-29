import { describe, expect, it } from "vitest";

import type { LintContext } from "../types";
import { withNolockRule } from "./with-nolock";

const createContext = (sql: string): LintContext => ({ sql, tokens: [] });

describe("withNolockRule", () => {
  describe("detection", () => {
    it("warns on WITH (NOLOCK) usage", () => {
      const diagnostics = withNolockRule.check(
        createContext("SELECT * FROM [A] WITH (NOLOCK)"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("warning");
      expect(diagnostics[0]?.message).toContain("NOLOCK");
    });

    it("does not warn when the hint is absent", () => {
      const diagnostics = withNolockRule.check(
        createContext("SELECT * FROM [A]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("detects multiple NOLOCK hints in one query", () => {
      const diagnostics = withNolockRule.check(
        createContext(
          "SELECT * FROM [A] WITH (NOLOCK) JOIN [B] WITH (NOLOCK) ON [A].Id = [B].Id",
        ),
      );

      expect(diagnostics).toHaveLength(2);
      expect(diagnostics.every((d) => d.severity === "warning")).toBe(true);
    });
  });

  describe("case insensitivity", () => {
    it("detects lowercase with(nolock)", () => {
      const diagnostics = withNolockRule.check(
        createContext("SELECT * FROM [A] with(nolock)"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("warning");
    });

    it("detects mixed case With(NoLock)", () => {
      const diagnostics = withNolockRule.check(
        createContext("SELECT * FROM [A] With(NoLock)"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("warning");
    });

    it("detects WITH ( NOLOCK ) with spaces inside parentheses", () => {
      const diagnostics = withNolockRule.check(
        createContext("SELECT * FROM [A] WITH ( NOLOCK )"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("warning");
    });
  });

  describe("comments are ignored", () => {
    it("ignores WITH (NOLOCK) inside line comments", () => {
      const diagnostics = withNolockRule.check(
        createContext("SELECT * FROM [A] -- WITH (NOLOCK)\nWHERE Id = 1"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("ignores WITH (NOLOCK) inside block comments", () => {
      const diagnostics = withNolockRule.check(
        createContext("SELECT * FROM [A] /* WITH (NOLOCK) */ WHERE Id = 1"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("detects NOLOCK after block comment ends", () => {
      const diagnostics = withNolockRule.check(
        createContext("SELECT * FROM [A] /* comment */ WITH (NOLOCK)"),
      );

      expect(diagnostics).toHaveLength(1);
    });
  });

  describe("string literals are ignored", () => {
    it("ignores NOLOCK text inside single-quoted strings", () => {
      const diagnostics = withNolockRule.check(
        createContext("SELECT 'WITH (NOLOCK)' AS Hint FROM [A]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("ignores NOLOCK text inside double-quoted strings", () => {
      const diagnostics = withNolockRule.check(
        createContext('SELECT "WITH (NOLOCK)" AS Hint FROM [A]'),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("handles escaped single quotes in strings", () => {
      const diagnostics = withNolockRule.check(
        createContext("SELECT 'It''s WITH (NOLOCK)' AS Hint FROM [A]"),
      );

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("bracket identifiers are ignored", () => {
    it("ignores NOLOCK inside bracket identifiers", () => {
      const diagnostics = withNolockRule.check(
        createContext("SELECT * FROM [WITH (NOLOCK)]"),
      );

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("CTE patterns (WITH not followed by NOLOCK)", () => {
    it("does not warn on CTE WITH clause", () => {
      const diagnostics = withNolockRule.check(
        createContext("WITH CTE AS (SELECT * FROM [A]) SELECT * FROM CTE"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("does not warn on WITH followed by other hints", () => {
      const diagnostics = withNolockRule.check(
        createContext("SELECT * FROM [A] WITH (READUNCOMMITTED)"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("does not warn when WITH is not followed by parenthesis", () => {
      const diagnostics = withNolockRule.check(
        createContext("SELECT * FROM [A] WITH TIES"),
      );

      expect(diagnostics).toHaveLength(0);
    });
  });
});
