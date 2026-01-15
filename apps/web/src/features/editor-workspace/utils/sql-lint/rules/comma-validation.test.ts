import { describe, expect, test } from "vitest";

import { assertDefined } from "@/test-utils";

import { tokenizeSql } from "../utils/tokenizer";
import { commaValidationRule } from "./comma-validation";

const checkRule = (sql: string) => {
  const tokens = tokenizeSql(sql);
  return commaValidationRule.check({ sql, tokens });
};

describe("commaValidationRule", () => {
  describe("trailing commas before keywords", () => {
    test("lintSql_WithTrailingCommaBeforeFrom_ReturnsError", () => {
      const diagnostics = checkRule("SELECT a, b, FROM [T]");
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("comma before FROM");
      expect(diagnostic.severity).toBe("error");
    });

    test("lintSql_WithTrailingCommaBeforeWhere_ReturnsError", () => {
      const diagnostics = checkRule("SELECT a, WHERE x = 1");
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("comma before WHERE");
      expect(diagnostic.severity).toBe("error");
    });

    test("lintSql_WithTrailingCommaBeforeGroupBy_ReturnsError", () => {
      const diagnostics = checkRule("SELECT a, GROUP BY a");
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("comma before GROUP");
      expect(diagnostic.severity).toBe("error");
    });

    test("lintSql_WithTrailingCommaBeforeOrderBy_ReturnsError", () => {
      const diagnostics = checkRule("SELECT a, ORDER BY a");
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("comma before ORDER");
      expect(diagnostic.severity).toBe("error");
    });

    test("lintSql_WithTrailingCommaBeforeHaving_ReturnsError", () => {
      const diagnostics = checkRule("SELECT COUNT(*), HAVING COUNT(*) > 1");
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("comma before HAVING");
      expect(diagnostic.severity).toBe("error");
    });

    test("lintSql_WithTrailingCommaBeforeJoin_ReturnsError", () => {
      const diagnostics = checkRule("SELECT a, INNER JOIN [T2] ON 1=1");
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("comma before INNER");
      expect(diagnostic.severity).toBe("error");
    });

    test("lintSql_WithTrailingCommaBeforeUnion_ReturnsError", () => {
      const diagnostics = checkRule("SELECT a, UNION SELECT b");
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("comma before UNION");
      expect(diagnostic.severity).toBe("error");
    });
  });

  describe("leading commas", () => {
    test("lintSql_WithLeadingCommaInSelect_ReturnsError", () => {
      const diagnostics = checkRule("SELECT , a FROM [T]");
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("Missing column before comma");
      expect(diagnostic.severity).toBe("error");
    });

    test("lintSql_WithLeadingCommaAfterSelectWithWhitespace_ReturnsError", () => {
      const diagnostics = checkRule("SELECT \n  , a FROM [T]");
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("Missing column before comma");
      expect(diagnostic.severity).toBe("error");
    });
  });

  describe("double commas", () => {
    test("lintSql_WithDoubleComma_ReturnsError", () => {
      const diagnostics = checkRule("SELECT a,, b FROM [T]");
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("Double comma");
      expect(diagnostic.severity).toBe("error");
    });

    test("lintSql_WithDoubleCommaWithWhitespace_ReturnsError", () => {
      const diagnostics = checkRule("SELECT a, , b FROM [T]");
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("Double comma");
      expect(diagnostic.severity).toBe("error");
    });

    test("lintSql_WithDoubleCommaWithNewline_ReturnsError", () => {
      const diagnostics = checkRule("SELECT a,\n, b FROM [T]");
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("Double comma");
      expect(diagnostic.severity).toBe("error");
    });
  });

  describe("trailing commas in clauses", () => {
    test("lintSql_WithTrailingCommaInGroupBy_ReturnsError", () => {
      const diagnostics = checkRule("SELECT a FROM [T] GROUP BY a, b,");
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("Trailing comma");
      expect(diagnostic.message).toContain("GROUP BY");
      expect(diagnostic.severity).toBe("error");
    });

    test("lintSql_WithTrailingCommaInOrderBy_ReturnsError", () => {
      const diagnostics = checkRule("SELECT a FROM [T] ORDER BY a,");
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("Trailing comma");
      expect(diagnostic.message).toContain("ORDER BY");
      expect(diagnostic.severity).toBe("error");
    });

    test("lintSql_WithTrailingCommaInOrderByWithWhitespace_ReturnsError", () => {
      const diagnostics = checkRule("SELECT a FROM [T] ORDER BY a, b, \n");
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("Trailing comma");
      expect(diagnostic.message).toContain("ORDER BY");
      expect(diagnostic.severity).toBe("error");
    });
  });

  describe("valid comma usage", () => {
    test("lintSql_WithValidCommas_ReturnsNoError", () => {
      const diagnostics = checkRule("SELECT a, b, c FROM [T]");
      expect(diagnostics).toHaveLength(0);
    });

    test("lintSql_WithValidCommasInGroupBy_ReturnsNoError", () => {
      const diagnostics = checkRule("SELECT a, b FROM [T] GROUP BY a, b");
      expect(diagnostics).toHaveLength(0);
    });

    test("lintSql_WithValidCommasInOrderBy_ReturnsNoError", () => {
      const diagnostics = checkRule("SELECT a FROM [T] ORDER BY a, b");
      expect(diagnostics).toHaveLength(0);
    });

    test("lintSql_WithValidComplexQuery_ReturnsNoError", () => {
      const diagnostics = checkRule(
        "SELECT a, b, c FROM [T] WHERE x = 1 GROUP BY a, b ORDER BY a, b",
      );
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("commas in special contexts", () => {
    test("lintSql_WithCommaInsideString_IgnoresIt", () => {
      const diagnostics = checkRule("SELECT 'a, b,' FROM [T]");
      expect(diagnostics).toHaveLength(0);
    });

    test("lintSql_WithCommaInsideBrackets_IgnoresIt", () => {
      const diagnostics = checkRule("SELECT [Field,Name] FROM [T]");
      expect(diagnostics).toHaveLength(0);
    });

    test("lintSql_WithCommaInsideDoubleQuotes_IgnoresIt", () => {
      const diagnostics = checkRule('SELECT "Field,Name" FROM [T]');
      expect(diagnostics).toHaveLength(0);
    });

    test("lintSql_WithCommaInLineComment_IgnoresIt", () => {
      const diagnostics = checkRule(
        "SELECT a -- comment with , comma\n FROM [T]",
      );
      expect(diagnostics).toHaveLength(0);
    });

    test("lintSql_WithCommaInBlockComment_IgnoresIt", () => {
      const diagnostics = checkRule(
        "SELECT a /* comment with , comma */ FROM [T]",
      );
      expect(diagnostics).toHaveLength(0);
    });

    test("lintSql_WithCommaInFunctionCall_IgnoresIt", () => {
      const diagnostics = checkRule("SELECT CONCAT(a, b) FROM [T]");
      expect(diagnostics).toHaveLength(0);
    });

    test("lintSql_WithCommaInSubquery_IgnoresIt", () => {
      const diagnostics = checkRule(
        "SELECT a FROM [T] WHERE x IN (SELECT y, z FROM [T2])",
      );
      expect(diagnostics).toHaveLength(0);
    });

    test("lintSql_WithTrailingCommaInSubquery_IgnoresIt", () => {
      const diagnostics = checkRule("SELECT (SELECT a, FROM [T2]) FROM [T]");
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    test("lintSql_WithMultipleErrors_ReturnsAllErrors", () => {
      const diagnostics = checkRule("SELECT a,, b, FROM [T]");
      expect(diagnostics.length).toBeGreaterThan(0);
      const hasDoubleComma = diagnostics.some((d) =>
        d.message.includes("Double comma"),
      );
      const hasTrailingComma = diagnostics.some((d) =>
        d.message.includes("Trailing comma"),
      );
      expect(hasDoubleComma).toBe(true);
      expect(hasTrailingComma).toBe(true);
    });

    test("lintSql_WithEmptySelect_NoError", () => {
      const diagnostics = checkRule("SELECT FROM [T]");
      expect(diagnostics).toHaveLength(0);
    });

    test("lintSql_WithCaseInsensitiveKeywords_ReturnsError", () => {
      const diagnostics = checkRule("select a, from [T]");
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("comma before FROM");
    });

    test("lintSql_WithMixedCaseKeywords_ReturnsError", () => {
      const diagnostics = checkRule("SeLeCt a, FrOm [T]");
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("comma before FROM");
    });

    test("lintSql_WithNestedSubqueriesAndCommas_ReturnsNoError", () => {
      const diagnostics = checkRule(
        "SELECT a, b FROM (SELECT x, y FROM (SELECT m, n FROM [T3])) WHERE c = 1",
      );
      expect(diagnostics).toHaveLength(0);
    });

    test("lintSql_WithEscapedQuoteInString_IgnoresComma", () => {
      const diagnostics = checkRule("SELECT 'O''Reilly, Books' FROM [T]");
      expect(diagnostics).toHaveLength(0);
    });
  });
});
