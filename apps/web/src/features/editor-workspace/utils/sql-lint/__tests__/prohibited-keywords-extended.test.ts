/**
 * Extended tests for prohibited keywords rule.
 *
 * Validates:
 * - All prohibited keywords (DML, DDL, procedural)
 * - Keywords in string literals should NOT trigger
 * - Keywords in comments should NOT trigger
 * - Keywords in identifiers/brackets should NOT trigger
 */

import { describe, expect, test } from "vitest";

import { assertDefined } from "@/test-utils";

import { prohibitedKeywordsRule } from "../rules/prohibited-keywords";

describe("Prohibited Keywords Extended", () => {
  describe("DDL Keywords", () => {
    test("create_triggers_error", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "CREATE TABLE Test (ID INT)",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.severity).toBe("error");
      expect(diagnostic.message).toContain("DDL");
    });

    test("alter_triggers_error", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "ALTER TABLE Contacts ADD Email VARCHAR(100)",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.severity).toBe("error");
      expect(diagnostic.message).toContain("DDL");
    });

    test("drop_triggers_error", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "DROP TABLE Contacts",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.severity).toBe("error");
      expect(diagnostic.message).toContain("DDL");
    });

    test("grant_triggers_error", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "GRANT SELECT ON Contacts TO public",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.severity).toBe("error");
    });

    test("revoke_triggers_error", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "REVOKE SELECT ON Contacts FROM public",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(1);
    });
  });

  describe("DML Keywords", () => {
    test("insert_triggers_error", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "INSERT INTO Contacts (Name) VALUES ('Test')",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.severity).toBe("error");
      expect(diagnostic.message).toContain("INSERT");
    });

    test("update_triggers_error", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "UPDATE Contacts SET Name = 'Test' WHERE ID = 1",
        tokens: [],
      });
      // UPDATE and SET are both prohibited (DML and procedural respectively)
      expect(diagnostics).toHaveLength(2);
      const updateDiag = diagnostics.find((d) => d.message.includes("UPDATE"));
      assertDefined(updateDiag);
      expect(updateDiag.severity).toBe("error");
    });

    test("delete_triggers_error", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "DELETE FROM Contacts WHERE ID = 1",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("DELETE");
    });

    test("merge_triggers_error", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "MERGE INTO Target USING Source ON Target.ID = Source.ID",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(1);
    });

    test("truncate_triggers_error", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "TRUNCATE TABLE Contacts",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(1);
    });
  });

  describe("Procedural Keywords", () => {
    test("declare_triggers_error", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "DECLARE @var INT",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("procedural");
    });

    test("set_triggers_error", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "SET @var = 1",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(1);
    });

    test("while_triggers_error", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "WHILE @i < 10 BEGIN SELECT 1 END",
        tokens: [],
      });
      expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    });

    test("if_triggers_error", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "IF @var = 1 SELECT 1",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(1);
    });

    test("exec_triggers_error", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "EXEC sp_help",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(1);
    });

    test("execute_triggers_error", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "EXECUTE sp_help",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(1);
    });
  });

  describe("Keywords in String Literals", () => {
    test("insert_in_single_quoted_string_does_not_trigger", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "SELECT * FROM Contacts WHERE Name = 'INSERT'",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(0);
    });

    test("update_in_single_quoted_string_does_not_trigger", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "SELECT * FROM Contacts WHERE Status = 'UPDATE_PENDING'",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(0);
    });

    test("delete_in_single_quoted_string_does_not_trigger", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "SELECT * FROM Contacts WHERE Action = 'DELETE'",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(0);
    });

    test("create_in_single_quoted_string_does_not_trigger", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "SELECT * FROM Contacts WHERE Operation = 'CREATE'",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(0);
    });

    test("multiple_keywords_in_string_do_not_trigger", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "SELECT * FROM Contacts WHERE Description = 'INSERT UPDATE DELETE'",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(0);
    });

    test("escaped_quote_in_string_is_handled", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "SELECT * FROM Contacts WHERE Name = 'It''s INSERT time'",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(0);
    });

    test("keyword_in_double_quoted_identifier_does_not_trigger", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: 'SELECT * FROM "INSERT_Table"',
        tokens: [],
      });
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("Keywords in Brackets", () => {
    test("insert_in_brackets_does_not_trigger", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "SELECT * FROM [INSERT]",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(0);
    });

    test("update_in_brackets_does_not_trigger", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "SELECT [UPDATE] FROM Contacts",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(0);
    });

    test("delete_in_brackets_does_not_trigger", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "SELECT * FROM [DELETE_Log]",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(0);
    });

    test("create_in_brackets_does_not_trigger", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "SELECT [CREATE_Date] FROM Contacts",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("Keywords in Comments", () => {
    test("insert_in_line_comment_does_not_trigger", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "SELECT * FROM Contacts -- INSERT not allowed",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(0);
    });

    test("update_in_block_comment_does_not_trigger", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "SELECT * FROM Contacts /* UPDATE is prohibited */",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(0);
    });

    test("multiline_block_comment_with_keywords", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: `SELECT * FROM Contacts
          /* This query does not use INSERT,
             UPDATE, or DELETE.
             It's just a SELECT. */`,
        tokens: [],
      });
      expect(diagnostics).toHaveLength(0);
    });

    test("nested_comment_style_keywords", () => {
      // Note: SQL Server doesn't support nested block comments
      // But we should handle the content correctly
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "SELECT * FROM Contacts /* INSERT /* nested */ DELETE */",
        tokens: [],
      });
      // After */ ends the comment, "DELETE */" is code - but actually DELETE comes before nested */
      // Let's trace: /* INSERT /* nested */ - this ends at first */
      // Then " DELETE */" is actual SQL - DELETE is a keyword!
      // Actually wait, let me re-check: "/* INSERT /* nested */ DELETE */"
      // First /* starts comment at position 28
      // First */ is at position 50 (after "nested")
      // So "INSERT /* nested" is in comment
      // Then " DELETE */" is actual SQL - DELETE triggers!
      expect(diagnostics).toHaveLength(1);
    });
  });

  describe("Temp Tables", () => {
    test("hash_temp_table_triggers_error", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "SELECT * FROM #TempTable",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.message).toContain("Temp tables");
      expect(diagnostic.message).toContain("subquery");
    });

    test("hash_in_string_does_not_trigger", () => {
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "SELECT * FROM Contacts WHERE Code = '#123'",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(0);
    });

    test("hash_alone_does_not_trigger", () => {
      // Just # without word chars after it shouldn't trigger
      const diagnostics = prohibitedKeywordsRule.check({
        sql: "SELECT '#' FROM Contacts",
        tokens: [],
      });
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("Position Tracking", () => {
    test("startIndex_and_endIndex_are_correct_for_insert", () => {
      const sql = "INSERT INTO Contacts (Name) VALUES ('Test')";
      const diagnostics = prohibitedKeywordsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.startIndex).toBe(0);
      expect(diagnostic.endIndex).toBe(6); // "INSERT".length
    });

    test("startIndex_and_endIndex_are_correct_for_mid_query_keyword", () => {
      const sql = "SELECT * FROM Contacts; DELETE FROM Logs";
      const diagnostics = prohibitedKeywordsRule.check({ sql, tokens: [] });
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      assertDefined(diagnostic);
      expect(diagnostic.startIndex).toBe(sql.indexOf("DELETE"));
      expect(diagnostic.endIndex).toBe(sql.indexOf("DELETE") + 6);
    });
  });
});
