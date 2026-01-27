import { describe, expect, it } from "vitest";

import type { LintContext } from "../types";
import { cteDetectionRule } from "./cte-detection";

const createContext = (sql: string): LintContext => ({ sql, tokens: [] });

describe("cteDetectionRule", () => {
  it("flags CTE usage (WITH ... AS (...))", () => {
    const diagnostics = cteDetectionRule.check(
      createContext("WITH cte AS (SELECT 1 AS One) SELECT * FROM cte"),
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.severity).toBe("error");
    expect(diagnostics[0]?.message).toContain("WITH");
  });

  it("ignores keyword-like text inside string literals", () => {
    const diagnostics = cteDetectionRule.check(
      createContext("SELECT 'WITH cte AS' AS Example"),
    );

    expect(diagnostics).toHaveLength(0);
  });

  it("flags multiple CTEs in sequence", () => {
    const sql =
      "WITH cte1 AS (SELECT 1 AS One), cte2 AS (SELECT 2 AS Two) SELECT * FROM cte1";
    const diagnostics = cteDetectionRule.check(createContext(sql));

    // Should flag the WITH keyword for CTE usage
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.severity).toBe("error");
    expect(diagnostics[0]?.message).toContain("WITH");
  });

  it("flags CTE with column list", () => {
    const sql = "WITH cte (Col1, Col2) AS (SELECT 1, 2) SELECT * FROM cte";
    const diagnostics = cteDetectionRule.check(createContext(sql));

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.severity).toBe("error");
  });

  it("flags CTE with complex subquery", () => {
    const sql =
      "WITH cte AS (SELECT * FROM (SELECT ID FROM [A]) sub) SELECT * FROM cte";
    const diagnostics = cteDetectionRule.check(createContext(sql));

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.severity).toBe("error");
  });
});
