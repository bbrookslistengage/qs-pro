/**
 * Tests for remaining rule edge cases.
 *
 * Covers edge cases for:
 * - aggregate-grouping rule
 * - unsupported-functions rule
 */

import { describe, expect, test } from "vitest";

import { assertDefined } from "@/test-utils";

import { aggregateGroupingRule } from "../rules/aggregate-grouping";
import { unsupportedFunctionsRule } from "../rules/unsupported-functions";

describe("Aggregate Grouping Edge Cases", () => {
  describe("Aggregates with Aliases", () => {
    test("aggregate_with_alias_is_valid", () => {
      const sql =
        "SELECT COUNT(ID) AS TotalCount, Category FROM Contacts GROUP BY Category";
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });

    test("multiple_aggregates_with_aliases_are_valid", () => {
      const sql = `
        SELECT
          Category,
          COUNT(ID) AS TotalCount,
          SUM(Amount) AS TotalAmount,
          AVG(Amount) AS AvgAmount
        FROM Contacts
        GROUP BY Category
      `;
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("Nested Aggregates", () => {
    test("aggregate_in_aggregate_is_valid", () => {
      // This is actually invalid SQL (can't nest aggregates), but our linter
      // doesn't check for this semantic error - it just checks for GROUP BY
      const sql = "SELECT MAX(COUNT(ID)) FROM Contacts";
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      // The linter sees MAX() as aggregate, so no non-aggregated columns error
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("Table-Qualified Columns", () => {
    test("table_qualified_column_in_group_by_matches", () => {
      const sql = `
        SELECT t.Category, COUNT(t.ID)
        FROM Contacts t
        GROUP BY t.Category
      `;
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });

    test("unqualified_select_matches_qualified_group_by", () => {
      const sql = `
        SELECT Category, COUNT(ID)
        FROM Contacts t
        GROUP BY t.Category
      `;
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      // The linter should match "Category" with "t.Category" in GROUP BY
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("No Aggregate Functions", () => {
    test("query_without_aggregates_is_valid", () => {
      const sql = "SELECT ID, Name, Email FROM Contacts";
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });

    test("query_with_group_by_but_no_aggregates_is_valid", () => {
      const sql = "SELECT Category FROM Contacts GROUP BY Category";
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("Only Aggregates", () => {
    test("only_count_is_valid", () => {
      const sql = "SELECT COUNT(*) FROM Contacts";
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });

    test("multiple_aggregates_only_is_valid", () => {
      const sql = "SELECT COUNT(*), SUM(Amount), AVG(Amount) FROM Orders";
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("Missing GROUP BY", () => {
    test("non_aggregated_column_with_aggregate_requires_group_by", () => {
      const sql = "SELECT Category, COUNT(ID) FROM Contacts";
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("GROUP BY");
      expect(diagnostic.message).toContain("Category");
    });

    test("multiple_non_aggregated_columns_each_get_error", () => {
      const sql = "SELECT Category, Region, COUNT(ID) FROM Contacts";
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      // Both Category and Region should get errors
      expect(diagnostics).toHaveLength(2);
    });
  });

  describe("Incomplete GROUP BY", () => {
    test("missing_column_in_group_by_triggers_error", () => {
      const sql =
        "SELECT Category, Region, COUNT(ID) FROM Contacts GROUP BY Category";
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      // Region is not in GROUP BY
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("Region");
    });
  });

  describe("Literals Do Not Require GROUP BY", () => {
    test("string_literal_with_aggregate_is_valid", () => {
      const sql = "SELECT 'Total', COUNT(*) FROM Contacts";
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });

    test("number_literal_with_aggregate_is_valid", () => {
      const sql = "SELECT 1, COUNT(*) FROM Contacts";
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("Aggregates in Comments", () => {
    test("aggregate_function_in_line_comment_ignored", () => {
      const sql = "SELECT ID FROM Contacts -- COUNT(*) not used";
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      // No aggregates in actual query, just a plain SELECT
      expect(diagnostics).toHaveLength(0);
    });

    test("aggregate_function_in_block_comment_ignored", () => {
      const sql = "SELECT ID FROM Contacts /* SUM(Amount) */";
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("Case Insensitivity", () => {
    test("lowercase_count_is_recognized", () => {
      const sql = "SELECT Category, count(ID) FROM Contacts";
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      // count(ID) should be recognized as aggregate
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("Category");
    });

    test("mixed_case_sum_is_recognized", () => {
      const sql = "SELECT Category, SuM(Amount) FROM Contacts";
      const diagnostics = aggregateGroupingRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(1);
    });
  });
});

describe("Unsupported Functions Edge Cases", () => {
  describe("Functions in String Literals", () => {
    test("string_split_in_string_does_not_trigger", () => {
      const sql =
        "SELECT * FROM Contacts WHERE Description = 'use STRING_SPLIT'";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });

    test("try_cast_in_string_does_not_trigger", () => {
      const sql = "SELECT * FROM Contacts WHERE Note = 'use TRY_CAST instead'";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });

    test("openjson_in_string_does_not_trigger", () => {
      const sql = "SELECT * FROM Contacts WHERE Info = 'OPENJSON(data)'";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("Functions in Comments", () => {
    test("string_split_in_line_comment_does_not_trigger", () => {
      const sql = "SELECT * FROM Contacts -- STRING_SPLIT() not used here";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });

    test("try_convert_in_block_comment_does_not_trigger", () => {
      const sql = "SELECT * FROM Contacts /* TRY_CONVERT is unavailable */";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });

    test("multiline_comment_with_unsupported_function", () => {
      const sql = `
        SELECT * FROM Contacts
        /* Note: Do not use OPENJSON() or
           STRING_SPLIT() in this query */
      `;
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("Functions in Brackets", () => {
    test("unsupported_function_name_as_column_in_brackets", () => {
      const sql = "SELECT [STRING_SPLIT] FROM Contacts";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      // [STRING_SPLIT] is a column name, not a function call
      expect(diagnostics).toHaveLength(0);
    });

    test("unsupported_function_name_as_table_in_brackets", () => {
      const sql = "SELECT * FROM [OPENJSON]";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      // [OPENJSON] is a table name, not a function call
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("Function Call Detection", () => {
    test("unsupported_function_with_parenthesis_triggers", () => {
      const sql = "SELECT STRING_SPLIT('a,b,c', ',')";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("STRING_SPLIT");
    });

    test("unsupported_function_with_space_before_paren_triggers", () => {
      const sql = "SELECT STRING_SPLIT   ('a,b,c', ',')";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(1);
    });

    test("function_name_without_parenthesis_does_not_trigger", () => {
      // STRING_SPLIT as a standalone word (not a function call)
      const sql = "SELECT STRING_SPLIT FROM Contacts";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      // Without parenthesis, it's a column name, not function call
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("Multiple Unsupported Functions", () => {
    test("multiple_different_unsupported_functions", () => {
      const sql =
        "SELECT STRING_SPLIT('a,b', ','), TRY_CAST('1' AS INT), OPENJSON('{}')";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      // All three should be detected
      expect(diagnostics).toHaveLength(3);
    });

    test("same_unsupported_function_multiple_times", () => {
      const sql =
        "SELECT TRY_CAST('1' AS INT), TRY_CAST('2' AS INT), TRY_CAST('3' AS INT)";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(3);
    });
  });

  describe("Alternative Suggestions", () => {
    test("try_cast_suggests_cast", () => {
      const sql = "SELECT TRY_CAST('123' AS INT)";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("CAST");
    });

    test("try_convert_suggests_convert", () => {
      const sql = "SELECT TRY_CONVERT(INT, '123')";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("CONVERT");
    });

    test("string_split_has_no_alternative", () => {
      const sql = "SELECT STRING_SPLIT('a,b,c', ',')";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("no direct equivalent");
    });
  });

  describe("Case Insensitivity", () => {
    test("lowercase_unsupported_function_triggers", () => {
      const sql = "SELECT string_split('a,b,c', ',')";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(1);
    });

    test("mixed_case_unsupported_function_triggers", () => {
      const sql = "SELECT StRiNg_SpLiT('a,b,c', ',')";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(1);
    });

    test("uppercase_unsupported_function_triggers", () => {
      const sql = "SELECT TRY_CONVERT(INT, '123')";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(1);
    });
  });

  describe("Position Tracking", () => {
    test("startIndex_matches_function_position", () => {
      const sql = "SELECT ID, TRY_CAST('1' AS INT) FROM Contacts";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.startIndex).toBe(sql.toLowerCase().indexOf("try_cast"));
    });

    test("endIndex_is_after_function_name", () => {
      const sql = "SELECT STRING_SPLIT('a,b', ',')";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      const funcStart = sql.toLowerCase().indexOf("string_split");
      expect(diagnostic.endIndex).toBe(funcStart + "string_split".length);
    });
  });

  describe("Supported Functions No Error", () => {
    test("cast_is_allowed", () => {
      const sql = "SELECT CAST('123' AS INT)";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });

    test("convert_is_allowed", () => {
      const sql = "SELECT CONVERT(INT, '123')";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });

    test("isnull_is_allowed", () => {
      const sql = "SELECT ISNULL(Name, 'N/A')";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });

    test("coalesce_is_allowed", () => {
      const sql = "SELECT COALESCE(Name, Email, 'Unknown')";
      const diagnostics = unsupportedFunctionsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(0);
    });
  });
});
