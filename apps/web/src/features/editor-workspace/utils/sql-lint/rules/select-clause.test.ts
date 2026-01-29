import { describe, expect, it } from "vitest";

import type { LintContext } from "../types";
import { tokenizeSql } from "../utils/tokenizer";
import { selectClauseRule } from "./select-clause";

const createContext = (sql: string): LintContext => ({
  sql,
  tokens: tokenizeSql(sql),
});

describe("selectClauseRule", () => {
  describe("SELECT statement validation", () => {
    it("requires a SELECT statement", () => {
      const diagnostics = selectClauseRule.check(createContext("FROM [A]"));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("prereq");
      expect(diagnostics[0]?.message).toContain("SELECT");
    });

    it("reports error when SELECT is missing in short query", () => {
      const diagnostics = selectClauseRule.check(createContext("FROM"));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("prereq");
    });
  });

  describe("literal expressions", () => {
    it("requires aliases for numeric literal expressions", () => {
      const diagnostics = selectClauseRule.check(createContext("SELECT 1"));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain("alias");
    });

    it("requires aliases for string literal expressions", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT 'hello'"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain("alias");
    });

    it("requires aliases for decimal number literals", () => {
      const diagnostics = selectClauseRule.check(createContext("SELECT 3.14"));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain("alias");
    });

    it("allows decimal number with alias", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT 3.14 AS Pi"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("requires aliases for NULL keyword literal", () => {
      const diagnostics = selectClauseRule.check(createContext("SELECT NULL"));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain("alias");
    });

    it("requires aliases for TRUE keyword literal", () => {
      const diagnostics = selectClauseRule.check(createContext("SELECT TRUE"));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });

    it("requires aliases for FALSE keyword literal", () => {
      const diagnostics = selectClauseRule.check(createContext("SELECT FALSE"));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });

    it("allows keyword literals with aliases", () => {
      const diagnostics = selectClauseRule.check(
        createContext(
          "SELECT NULL AS NullVal, TRUE AS TrueVal, FALSE AS FalseVal",
        ),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("allows aliased literal SELECT expressions without a FROM clause", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT 1 AS One"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("allows implicit alias (space only, no AS keyword)", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT 42 Answer"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("allows bracketed alias after AS keyword", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT 1 AS [My Value]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("allows multiple aliased literals", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT 'hello' AS Greeting, 42 AS Answer"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("does not treat keyword-like identifier as literal", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT TRUEFALSE FROM [T]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("does not treat NULLABLE as NULL literal", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT NULLABLE FROM [T]"),
      );

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("complex expressions", () => {
    it("allows complex expressions with operators", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT [A] + [B] AS Total FROM [Table]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("allows nested function calls", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT UPPER(LEFT([Name], 1)) AS Initial FROM [Table]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("allows aggregate functions with aliases", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT COUNT(*) AS Total FROM [Table]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("allows complex operator chain with multiple fields", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT [A] + [B] * [C] AS Calc FROM [Table]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("allows CASE expression with alias", () => {
      const diagnostics = selectClauseRule.check(
        createContext(
          "SELECT CASE WHEN [X] = 1 THEN 'A' ELSE 'B' END AS Result FROM [T]",
        ),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("allows CASE expression without alias since it has a field reference", () => {
      const diagnostics = selectClauseRule.check(
        createContext(
          "SELECT CASE WHEN [X] = 1 THEN 'A' ELSE 'B' END FROM [T]",
        ),
      );

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("escaped characters", () => {
    it("allows escaped single quotes in string literals", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT 'It''s great' AS Msg"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("handles escaped brackets in identifiers", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT [Col]]Name] FROM [T]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("handles comma inside string literal", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT 'a,b' AS Csv"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("handles double quotes in expressions (field references)", () => {
      const diagnostics = selectClauseRule.check(
        createContext('SELECT "FieldName" FROM [Table]'),
      );

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("FROM clause validation", () => {
    it("requires FROM clause when selecting fields", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT [Field]"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("prereq");
      expect(diagnostics[0]?.message).toContain("FROM");
    });

    it("requires Data Extension in FROM clause when selecting fields", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT [A] FROM (SELECT 1 AS X) AS Sub"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.message).toContain("Data Extension");
    });

    it("allows SELECT with valid FROM clause", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT [Field] FROM [Table]"),
      );

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("empty/edge cases", () => {
    it("reports error for empty SELECT clause", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT FROM [T]"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("prereq");
      expect(diagnostics[0]?.message).toContain("at least one field");
    });

    it("reports error for whitespace-only SELECT clause", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT     FROM [T]"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("prereq");
    });

    it("allows star selector", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT * FROM [Table]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("handles SELECT without FROM at end of query", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT 1 AS One, 2 AS Two"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("treats expression with invalid alias as non-literal requiring FROM", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT 1 AS +invalid"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("prereq");
      expect(diagnostics[0]?.message).toContain("FROM");
    });

    it("handles literal followed by garbage", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT 1 + FROM [T]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("detects unaliased literal in mixed expressions", () => {
      const diagnostics = selectClauseRule.check(
        createContext("SELECT [Field], 42 FROM [T]"),
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain("alias");
    });
  });
});
