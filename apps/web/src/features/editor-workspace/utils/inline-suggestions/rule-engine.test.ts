import { describe, expect, test } from "vitest";

import { getSqlCursorContext } from "../sql-context";
import { evaluateInlineSuggestions } from "./rule-engine";
import type { InlineSuggestionContext } from "./types";

const buildContext = (
  sql: string,
  cursorIndex: number = sql.length,
): InlineSuggestionContext => {
  const sqlContext = getSqlCursorContext(sql, cursorIndex);
  return {
    sql,
    cursorIndex,
    sqlContext,
    tablesInScope: sqlContext.tablesInScope,
    existingAliases: new Set(
      sqlContext.tablesInScope
        .map((t) => t.alias?.toLowerCase())
        .filter((a): a is string => Boolean(a)),
    ),
    getFieldsForTable: async () => [],
  };
};

describe("evaluateInlineSuggestions", () => {
  describe("rule matching", () => {
    test("afterINNER_ReturnsJoinSuggestion", async () => {
      const ctx = buildContext("SELECT * FROM [A] INNER");
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion?.text).toBe(" JOIN");
    });

    test("afterLEFT_ReturnsJoinSuggestion", async () => {
      const ctx = buildContext("SELECT * FROM [A] LEFT");
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion?.text).toBe(" JOIN");
    });

    test("afterJoinTableNoAlias_ReturnsAliasSuggestion", async () => {
      const ctx = buildContext("SELECT * FROM [A] JOIN [OrderDetails] ");
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion?.text).toBe(" AS od");
    });

    test("afterJoinTableWithAlias_ReturnsOnSuggestion", async () => {
      const ctx = buildContext("SELECT * FROM [A] a JOIN [B] b ");
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion?.text).toBe(" ON ");
    });

    test("afterSelect_ReturnsNull", async () => {
      const ctx = buildContext("SELECT ");
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion).toBeNull();
    });

    test("afterFromTableNoAlias_ReturnsAliasSuggestion", async () => {
      const ctx = buildContext("SELECT * FROM [Orders] ");
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion?.text).toBe(" AS o");
    });

    test("insideBracketedFromTableEnd_ReturnsAliasSuggestion", async () => {
      const sql = "SELECT * FROM [Orders]";
      const cursorIndex = sql.length - 1; // before the auto-closed `]`
      const ctx = buildContext(sql, cursorIndex);
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion?.text).toBe("] AS o");
    });

    test("afterFromTableWithAlias_ReturnsNull", async () => {
      const ctx = buildContext("SELECT * FROM [Orders] o ");
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion).toBeNull();
    });
  });

  describe("priority order", () => {
    test("priorityOrder_JoinKeywordWins", async () => {
      const ctx = buildContext("SELECT * FROM [A] INNER");
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion?.priority).toBe(100);
    });

    test("priorityOrder_AliasSuggestionHasPriority80", async () => {
      const ctx = buildContext("SELECT * FROM [Orders] ");
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion?.priority).toBe(80);
    });

    test("priorityOrder_OnKeywordHasPriority70", async () => {
      const ctx = buildContext("SELECT * FROM [A] a JOIN [B] b ");
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion?.priority).toBe(70);
    });
  });

  describe("negative conditions - suppression", () => {
    test("insideString_SuppressesSuggestions", async () => {
      const sql = "SELECT * FROM [A] WHERE name = 'INNER";
      const ctx = buildContext(sql);
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion).toBeNull();
    });

    test("insideLineComment_SuppressesSuggestions", async () => {
      const sql = "SELECT * FROM [A] -- INNER";
      const ctx = buildContext(sql);
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion).toBeNull();
    });

    test("insideBlockComment_SuppressesSuggestions", async () => {
      const sql = "SELECT * FROM [A] /* INNER";
      const ctx = buildContext(sql);
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion).toBeNull();
    });

    test("afterComparisonOperator_SuppressesSuggestions", async () => {
      const sql = "SELECT * FROM [A] WHERE id = ";
      const ctx = buildContext(sql);
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion).toBeNull();
    });

    test("insideFunctionParens_SuppressesSuggestions", async () => {
      const sql = "SELECT LEFT(name, ";
      const ctx = buildContext(sql);
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion).toBeNull();
    });

    test("insideBracketsInSelect_SuppressesSuggestions", async () => {
      const sql = "SELECT [Some Field";
      const ctx = buildContext(sql);
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion).toBeNull();
    });

    test("insideBracketsAtFromTableEnd_AllowsAliasSuggestion", async () => {
      const sql = "SELECT * FROM [Orders";
      const cursorIndex = sql.length;
      const ctx = buildContext(sql, cursorIndex);
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion?.text).toBe("] AS o");
    });
  });

  describe("edge cases", () => {
    test("leftInSelectClause_DoesNotSuggestJoin", async () => {
      const ctx = buildContext("SELECT LEFT");
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion).toBeNull();
    });

    test("rightInSelectClause_DoesNotSuggestJoin", async () => {
      const ctx = buildContext("SELECT RIGHT");
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion).toBeNull();
    });

    test("multipleJoins_SuggestsAliasForLatestTable", async () => {
      const ctx = buildContext(
        "SELECT * FROM [A] a JOIN [B] b ON a.id = b.id JOIN [CustomerOrders] ",
      );
      const suggestion = await evaluateInlineSuggestions(ctx);
      expect(suggestion?.text).toBe(" AS co");
    });
  });
});
