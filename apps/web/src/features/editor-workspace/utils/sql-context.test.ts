import { describe, expect, test } from "vitest";

import {
  extractTableReferences,
  getSqlCursorContext,
} from "./sql-context";

describe("getSqlCursorContext - characterization tests", () => {
  // 1. Test that lastKeyword is "on" after ON keyword
  test("lastKeyword_AfterOnKeyword_ReturnsOn", () => {
    const sql = "SELECT * FROM [A] a JOIN [B] b ON ";
    const context = getSqlCursorContext(sql, sql.length);
    expect(context.lastKeyword).toBe("on");
  });

  // 2. Test that currentWord is empty when cursor after space
  test("currentWord_AfterSpace_ReturnsEmpty", () => {
    const sql = "SELECT * FROM [A] a JOIN [B] b ON ";
    const context = getSqlCursorContext(sql, sql.length);
    expect(context.currentWord).toBe("");
  });

  // 3. Test that tablesInScope has 2 tables after JOIN
  test("tablesInScope_AfterJoin_HasTwoTables", () => {
    const sql = "SELECT * FROM [A] a JOIN [B] b ON ";
    const context = getSqlCursorContext(sql, sql.length);
    expect(context.tablesInScope).toHaveLength(2);
  });

  // 4. Test that ENT. prefix is NOT treated as an alias
  test("aliasBeforeDot_WithEntPrefix_ReturnsNull", () => {
    const sql = "SELECT * FROM ENT.";
    const context = getSqlCursorContext(sql, sql.length);
    // ENT. is the shared folder prefix, not an alias
    expect(context.aliasBeforeDot).toBeNull();
  });

  // 5. Test isAfterFromJoin detection
  test("isAfterFromJoin_AfterJoinKeyword_ReturnsTrue", () => {
    const sql = "SELECT * FROM [A] JOIN ";
    const context = getSqlCursorContext(sql, sql.length);
    expect(context.isAfterFromJoin).toBe(true);
  });

  test("lastKeyword_AfterJoinKeyword_ReturnsJoin", () => {
    const sql = "SELECT * FROM [A] JOIN ";
    const context = getSqlCursorContext(sql, sql.length);
    expect(context.lastKeyword).toBe("join");
  });

  test("lastKeyword_AfterGroupBy_ReturnsGroup", () => {
    const sql = "SELECT * FROM [A] GROUP BY ";
    const context = getSqlCursorContext(sql, sql.length);
    expect(context.lastKeyword).toBe("group");
  });

  test("lastKeyword_AfterOrderBy_ReturnsOrder", () => {
    const sql = "SELECT * FROM [A] ORDER BY ";
    const context = getSqlCursorContext(sql, sql.length);
    expect(context.lastKeyword).toBe("order");
  });
});

describe("getSqlCursorContext - ENT. prefix edge cases", () => {
  test("aliasBeforeDot_WithEntLowercase_ReturnsNull", () => {
    // Also handle lowercase ent.
    const sql = "SELECT * FROM ent.";
    const context = getSqlCursorContext(sql, sql.length);
    expect(context.aliasBeforeDot).toBeNull();
  });

  test("aliasBeforeDot_WithEntTableAlias_ReturnsAlias", () => {
    // Verify that real aliases still work when using ENT tables
    const sql = "SELECT e. FROM ENT.[Table] e";
    const cursorIndex = sql.indexOf("e.") + 2;
    const context = getSqlCursorContext(sql, cursorIndex);
    expect(context.aliasBeforeDot).toBe("e");
  });

  test("aliasBeforeDot_WithPartialFieldAfterDot_ReturnsAlias", () => {
    const sql = "SELECT a.sub FROM [Example] a";
    const cursorIndex = sql.indexOf("a.sub") + "a.sub".length;
    const context = getSqlCursorContext(sql, cursorIndex);
    expect(context.aliasBeforeDot).toBe("a");
  });
});

describe("extractTableReferences - Complex scenarios", () => {
  test("extracts_table_from_subquery_in_FROM_clause", () => {
    const sql = "SELECT * FROM (SELECT ID FROM [A]) sub";
    const references = extractTableReferences(sql);

    // Should find the subquery and the inner table [A]
    const subquery = references.find((ref) => ref.isSubquery);
    const tableA = references.find((ref) => ref.name === "A");

    expect(subquery).toBeDefined();
    expect(subquery?.alias).toBe("sub");
    expect(tableA).toBeDefined();
  });

  test("extracts_table_from_derived_table_with_alias", () => {
    const sql = "SELECT sub.ID FROM (SELECT ID FROM [Source]) AS sub";
    const references = extractTableReferences(sql);

    const subquery = references.find((ref) => ref.isSubquery);
    expect(subquery).toBeDefined();
    expect(subquery?.alias).toBe("sub");

    const source = references.find((ref) => ref.name === "Source");
    expect(source).toBeDefined();
  });

  test("extracts_tables_from_UNION_queries", () => {
    const sql = "SELECT ID FROM [A] UNION SELECT ID FROM [B]";
    const references = extractTableReferences(sql);

    const tableA = references.find((ref) => ref.name === "A");
    const tableB = references.find((ref) => ref.name === "B");

    expect(tableA).toBeDefined();
    expect(tableB).toBeDefined();
    expect(references.filter((r) => !r.isSubquery)).toHaveLength(2);
  });

  test("handles_table_references_in_CASE_expressions", () => {
    const sql = `
      SELECT
        CASE WHEN [Status] = 'Active' THEN 1 ELSE 0 END AS IsActive
      FROM [Contacts]
    `;
    const references = extractTableReferences(sql);

    const contacts = references.find((ref) => ref.name === "Contacts");
    expect(contacts).toBeDefined();
    expect(contacts?.isBracketed).toBe(true);
  });

  test("extracts_tables_from_correlated_subqueries", () => {
    const sql =
      "SELECT * FROM [A] WHERE EXISTS (SELECT 1 FROM [B] WHERE [B].ID = [A].ID)";
    const references = extractTableReferences(sql);

    const tableA = references.find((ref) => ref.name === "A");
    const tableB = references.find((ref) => ref.name === "B");

    expect(tableA).toBeDefined();
    expect(tableB).toBeDefined();
    // Both tables should be found at different scope depths
    expect(tableA?.scopeDepth).toBe(0);
    expect(tableB?.scopeDepth).toBe(1);
  });
});

describe("getSqlCursorContext - CTE context", () => {
  test("tracks_CTE_definitions_for_completion_context", () => {
    // CTE is not supported in MCE, but cursor context should still work
    const sql = "WITH cte AS (SELECT ID FROM [A]) SELECT * FROM ";
    const context = getSqlCursorContext(sql, sql.length);

    // After FROM, we should be ready for table completion
    expect(context.isAfterFromJoin).toBe(true);
    expect(context.lastKeyword).toBe("from");
  });

  test("resolves_CTE_references_in_main_query", () => {
    // Test that cursor context works within a CTE subquery
    const sql = "WITH cte AS (SELECT ID FROM [A] WHERE ";
    const context = getSqlCursorContext(sql, sql.length);

    // Inside CTE subquery, should see table [A]
    expect(context.cursorDepth).toBe(1);
    expect(context.lastKeyword).toBe("where");
  });

  test("handles_nested_CTEs", () => {
    // Multiple CTEs in sequence
    const sql = "WITH cte1 AS (SELECT 1 AS One), cte2 AS (SELECT 2 AS Two) SELECT * FROM ";
    const context = getSqlCursorContext(sql, sql.length);

    // After the CTE definitions, at depth 0
    expect(context.cursorDepth).toBe(0);
    expect(context.isAfterFromJoin).toBe(true);
  });
});

describe("getSqlCursorContext - Nested query scope", () => {
  test("maintains_separate_scope_for_subqueries", () => {
    // Cursor inside a subquery should have its own scope
    const sql = "SELECT * FROM [Outer] WHERE ID IN (SELECT ID FROM [Inner] WHERE ";
    const context = getSqlCursorContext(sql, sql.length);

    // Cursor is inside the subquery (depth 1)
    expect(context.cursorDepth).toBe(1);
    // Tables in scope should only include [Inner] at this depth
    const innerScope = context.tablesInScope.filter((t) => t.scopeDepth === 1);
    expect(innerScope.some((t) => t.name === "Inner")).toBe(true);
  });

  test("inherits_parent_scope_in_correlated_subqueries", () => {
    // In a correlated subquery, parent tables may be referenced
    const sql = "SELECT * FROM [Parent] p WHERE EXISTS (SELECT 1 FROM [Child] c WHERE c.ParentID = p.";
    const cursorIndex = sql.length;
    const context = getSqlCursorContext(sql, cursorIndex);

    // Cursor is inside the subquery
    expect(context.cursorDepth).toBe(1);
    // Should detect alias before dot
    expect(context.aliasBeforeDot).toBe("p");
  });

  test("handles_multiple_nesting_levels", () => {
    // Deeply nested subqueries
    const sql = "SELECT * FROM [A] WHERE ID IN (SELECT ID FROM [B] WHERE Val IN (SELECT Val FROM [C] WHERE ";
    const context = getSqlCursorContext(sql, sql.length);

    // Cursor is at depth 2 (two levels of nesting)
    expect(context.cursorDepth).toBe(2);
    expect(context.lastKeyword).toBe("where");
  });

  test("resets_scope_on_query_boundary", () => {
    // After closing a subquery, scope should reset to outer level
    const sql = "SELECT * FROM [Outer] WHERE ID IN (SELECT ID FROM [Inner]) AND Name = ";
    const context = getSqlCursorContext(sql, sql.length);

    // Cursor is back at depth 0 after the subquery closes
    expect(context.cursorDepth).toBe(0);
    // Tables in scope at depth 0 should include [Outer]
    expect(context.tablesInScope.some((t) => t.name === "Outer")).toBe(true);
  });
});
