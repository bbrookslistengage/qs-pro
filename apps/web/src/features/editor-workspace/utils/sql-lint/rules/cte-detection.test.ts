import { describe, expect, it } from "vitest";

import type { LintContext } from "../types";
import { cteDetectionRule } from "./cte-detection";

const createContext = (sql: string): LintContext => ({ sql, tokens: [] });

describe("cteDetectionRule", () => {
  describe("basic CTE detection", () => {
    it("flags CTE usage (WITH ... AS (...))", () => {
      const diagnostics = cteDetectionRule.check(
        createContext("WITH cte AS (SELECT 1 AS One) SELECT * FROM cte"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain("WITH");
    });

    it("flags multiple CTEs in sequence", () => {
      const sql =
        "WITH cte1 AS (SELECT 1 AS One), cte2 AS (SELECT 2 AS Two) SELECT * FROM cte1";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain("WITH");
    });

    it("flags CTE with complex subquery", () => {
      const sql =
        "WITH cte AS (SELECT * FROM (SELECT ID FROM [A]) sub) SELECT * FROM cte";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });
  });

  describe("bracket-escaped CTE names", () => {
    it("flags CTE with bracket-escaped name", () => {
      const sql = "WITH [My CTE] AS (SELECT 1 AS One) SELECT * FROM [My CTE]";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });

    it("flags CTE with bracket-escaped name containing spaces", () => {
      const sql =
        "WITH [Complex CTE Name] AS (SELECT ID FROM Tbl) SELECT * FROM [Complex CTE Name]";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });

    it("flags CTE with escaped bracket inside identifier (]])", () => {
      const sql =
        "WITH [CTE]]Name] AS (SELECT 1 AS One) SELECT * FROM [CTE]]Name]";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });
  });

  describe("column list variations", () => {
    it("flags CTE with column list", () => {
      const sql = "WITH cte (Col1, Col2) AS (SELECT 1, 2) SELECT * FROM cte";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });

    it("flags CTE with bracket-escaped columns in list", () => {
      const sql =
        "WITH cte ([Col 1], [Col 2]) AS (SELECT 1, 2) SELECT * FROM cte";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });

    it("flags CTE with escaped brackets inside column identifiers", () => {
      const sql =
        "WITH cte ([Col]]1], [Col2]) AS (SELECT 1, 2) SELECT * FROM cte";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });

    it("flags CTE with double-quoted columns in list", () => {
      const sql =
        'WITH cte ("Column One", "Column Two") AS (SELECT 1, 2) SELECT * FROM cte';
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });

    it("flags CTE with mixed bracket and double-quote columns", () => {
      const sql =
        'WITH cte ([Col 1], "Col 2") AS (SELECT 1, 2) SELECT * FROM cte';
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });
  });

  describe("comment handling", () => {
    it("ignores WITH inside line comment", () => {
      const sql = "-- WITH cte AS (SELECT 1)\nSELECT 1 AS One";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("ignores WITH inside block comment", () => {
      const sql = "/* WITH cte AS (SELECT 1) */ SELECT 1 AS One";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("ignores WITH in multi-line block comment", () => {
      const sql = `/*
        WITH cte AS (SELECT 1)
        SELECT * FROM cte
      */ SELECT 1 AS One`;
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("flags CTE after line comment ends", () => {
      const sql =
        "-- This is a comment\nWITH cte AS (SELECT 1) SELECT * FROM cte";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });

    it("flags CTE after block comment ends", () => {
      const sql =
        "/* comment */ WITH cte AS (SELECT 1) SELECT * FROM cte /* end */";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });
  });

  describe("string literal handling", () => {
    it("ignores keyword-like text inside single-quoted string literals", () => {
      const diagnostics = cteDetectionRule.check(
        createContext("SELECT 'WITH cte AS' AS Example"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("ignores WITH inside double-quoted identifier", () => {
      const sql = 'SELECT "WITH cte AS" FROM Tbl';
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("ignores WITH inside bracket identifier", () => {
      const sql = "SELECT [WITH cte AS] FROM Tbl";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("handles escaped single quotes inside string", () => {
      const sql = "SELECT 'It''s WITH cte AS' AS Example";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("does not flag WITH that is not followed by CTE pattern", () => {
      const sql = "SELECT * FROM Tbl WITH (NOLOCK)";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("does not flag partial WITH keyword (e.g., WITHDRAW)", () => {
      const sql = "SELECT WITHDRAW FROM Accounts";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("does not flag when AS is missing opening parenthesis", () => {
      const sql = "WITH cte AS SELECT 1";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("handles unclosed bracket in CTE name gracefully", () => {
      const sql = "WITH [unclosed AS (SELECT 1)";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("handles unclosed column list gracefully", () => {
      const sql = "WITH cte (Col1, Col2 AS (SELECT 1, 2)";
      const diagnostics = cteDetectionRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });
  });
});
