import { describe, expect, it } from "vitest";

import type { LintContext } from "../types";
import { selectStarWithJoinRule } from "./select-star-with-join";

const createContext = (sql: string): LintContext => ({
  sql,
  tokens: [],
});

describe("selectStarWithJoinRule", () => {
  describe("violation detection", () => {
    it("should detect SELECT * with JOIN", () => {
      const sql = "SELECT * FROM A JOIN B ON A.id = B.id";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
      expect(diagnostics[0]?.message).toContain("SELECT *");
      expect(diagnostics[0]?.message).toContain("JOIN");
    });

    it("should detect SELECT * with LEFT JOIN", () => {
      const sql = "SELECT * FROM A LEFT JOIN B ON A.id = B.id";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });

    it("should detect SELECT * with multiple JOINs", () => {
      const sql = "SELECT * FROM A JOIN B ON A.id = B.id JOIN C ON B.id = C.id";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics.length).toBeGreaterThanOrEqual(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });

    it("should detect SELECT * with RIGHT JOIN", () => {
      const sql = "SELECT * FROM A RIGHT JOIN B ON A.id = B.id";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });

    it("should detect SELECT * with INNER JOIN", () => {
      const sql = "SELECT * FROM A INNER JOIN B ON A.id = B.id";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });
  });

  describe("valid SQL (should pass)", () => {
    it("should pass SELECT * without JOIN (single table)", () => {
      const sql = "SELECT * FROM A";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("should pass qualified table.* with JOIN", () => {
      const sql = "SELECT A.*, B.name FROM A JOIN B ON A.id = B.id";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("should pass explicit columns with JOIN", () => {
      const sql = "SELECT A.id, B.name FROM A JOIN B ON A.id = B.id";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("should pass multiple qualified table.* with JOIN", () => {
      const sql = "SELECT A.*, B.* FROM A JOIN B ON A.id = B.id";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("string literal handling", () => {
    it("should not flag JOIN keyword in single-quoted string", () => {
      const sql = "SELECT 'JOIN' AS word FROM A";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("should handle escaped single quotes in string literals", () => {
      const sql =
        "SELECT * FROM A JOIN B ON A.id = B.id WHERE A.name = 'O''Brien'";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });

    it("should not flag JOIN in escaped quote string", () => {
      const sql = "SELECT * FROM A WHERE name = 'It''s a JOIN test'";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("should not flag JOIN inside double-quoted identifier", () => {
      const sql = 'SELECT "JOIN" FROM A';
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("should detect SELECT * with JOIN and double-quoted table names", () => {
      const sql = 'SELECT * FROM "A" JOIN "B" ON "A".id = "B".id';
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });

    it("should not flag * inside double-quoted column alias", () => {
      const sql = 'SELECT A.*, B."*column" FROM A JOIN B ON A.id = B.id';
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("comment handling", () => {
    it("should not flag JOIN keyword in line comment", () => {
      const sql = "SELECT * FROM A -- JOIN B";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("should not flag JOIN keyword in block comment", () => {
      const sql = "SELECT * FROM A /* JOIN B ON A.id = B.id */";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("should handle newline after line comment correctly", () => {
      const sql = `SELECT * FROM A -- comment
JOIN B ON A.id = B.id`;
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });

    it("should flag SELECT * after block comment with JOIN", () => {
      const sql = "/* comment */ SELECT * FROM A JOIN B ON A.id = B.id";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });
  });

  describe("bracketed identifier handling", () => {
    it("should handle bracketed identifiers with JOIN", () => {
      const sql =
        "SELECT * FROM [Table A] JOIN [Table B] ON [Table A].id = [Table B].id";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });

    it("should not flag JOIN inside bracketed identifier", () => {
      const sql = "SELECT [JOIN] FROM A";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("should not flag * inside bracketed identifier with JOIN", () => {
      const sql = "SELECT A.[*], B.name FROM A JOIN B ON A.id = B.id";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("SELECT clause tracking", () => {
    it("should track FROM keyword to end SELECT clause", () => {
      const sql = "SELECT A.id FROM A JOIN B ON A.id = B.id WHERE 2*3 = 6";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(0);
    });

    it("should detect SELECT * in subquery with JOIN", () => {
      const sql =
        "SELECT sub.id FROM (SELECT * FROM A JOIN B ON A.id = B.id) AS sub";
      const diagnostics = selectStarWithJoinRule.check(createContext(sql));

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]?.severity).toBe("error");
    });
  });
});
