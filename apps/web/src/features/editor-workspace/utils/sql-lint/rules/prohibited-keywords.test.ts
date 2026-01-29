import { describe, expect, it } from "vitest";

import type { LintContext } from "../types";
import { prohibitedKeywordsRule } from "./prohibited-keywords";

const createContext = (sql: string): LintContext => ({ sql, tokens: [] });

describe("prohibitedKeywordsRule", () => {
  describe("DML keyword detection", () => {
    it("flags UPDATE keyword", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext("UPDATE Contacts SET Name = 'Test' WHERE Id = 1"),
      );

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0]?.message).toContain("read-only");
    });

    it("flags INSERT keyword", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext("INSERT INTO Contacts (Name) VALUES ('Test')"),
      );

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0]?.message).toContain("read-only");
    });

    it("flags DELETE keyword", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext("DELETE FROM Contacts WHERE Id = 1"),
      );

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0]?.message).toContain("read-only");
    });
  });

  describe("DDL keyword detection", () => {
    it("flags CREATE keyword", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext("CREATE TABLE Test (Id INT)"),
      );

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain("DDL");
    });

    it("flags DROP keyword", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext("DROP TABLE Test"),
      );

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain("DDL");
    });

    it("flags ALTER keyword", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext("ALTER TABLE Test ADD Column1 INT"),
      );

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain("DDL");
    });
  });

  describe("procedural keyword detection", () => {
    it("flags DECLARE keyword", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext("DECLARE @var INT"),
      );

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0]?.message).toContain("procedural");
    });

    it("flags SET keyword", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext("SET @var = 1"),
      );

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0]?.message).toContain("procedural");
    });
  });

  describe("temp table detection", () => {
    it("flags temp tables (#table syntax)", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext("SELECT * FROM #TempTable"),
      );

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain("Temp tables");
    });

    it("flags temp tables with underscores", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext("SELECT * FROM #temp_data WHERE id = 1"),
      );

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0]?.message).toContain("Temp tables");
    });

    it("does not flag # followed by non-word character", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext("SELECT '#' FROM [A]"),
      );

      const tempTableDiagnostics = diagnostics.filter((d) =>
        d.message.includes("Temp tables"),
      );
      expect(tempTableDiagnostics).toHaveLength(0);
    });
  });

  describe("string literal handling", () => {
    it("does not flag keywords inside single-quoted string literals", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext("SELECT 'UPDATE' AS Example FROM [A]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("handles escaped single quotes in string literals", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext("SELECT 'It''s an UPDATE test' FROM [A]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("does not flag keywords inside double-quoted identifiers", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext('SELECT "UPDATE" FROM [A]'),
      );

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("bracketed identifier handling", () => {
    it("does not flag keywords inside bracketed identifiers", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext("SELECT [UPDATE] FROM [DELETE]"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("does not flag keywords in bracketed table names", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext("SELECT * FROM [INSERT_Log]"),
      );

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("comment handling", () => {
    it("does not flag keywords in line comments", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext("SELECT * FROM [A] -- UPDATE this later"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("does not flag keywords in block comments", () => {
      const diagnostics = prohibitedKeywordsRule.check(
        createContext("SELECT * FROM [A] /* DELETE this section */"),
      );

      expect(diagnostics).toHaveLength(0);
    });

    it("handles newline in line comments correctly", () => {
      const sql = `SELECT * FROM [A] -- UPDATE comment
DELETE FROM [B]`;
      const diagnostics = prohibitedKeywordsRule.check(createContext(sql));

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0]?.message).toContain("read-only");
    });
  });
});
