import { describe, expect, it } from "vitest";

import type { LintContext } from "../types";
import { offsetWithoutOrderByRule } from "./offset-without-order-by";

const createContext = (sql: string): LintContext => ({ sql, tokens: [] });

describe("offsetWithoutOrderByRule", () => {
  it("flags OFFSET usage without ORDER BY", () => {
    const diagnostics = offsetWithoutOrderByRule.check(
      createContext("SELECT * FROM A OFFSET 10 ROWS"),
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.severity).toBe("error");
    expect(diagnostics[0]?.message).toContain("ORDER BY");
  });

  it("allows OFFSET when ORDER BY is present", () => {
    const diagnostics = offsetWithoutOrderByRule.check(
      createContext("SELECT * FROM A ORDER BY Id OFFSET 10 ROWS"),
    );

    expect(diagnostics).toHaveLength(0);
  });

  it("flags OFFSET in subquery without ORDER BY", () => {
    const sql =
      "SELECT * FROM (SELECT * FROM [A] OFFSET 5 ROWS) sub ORDER BY ID";
    const diagnostics = offsetWithoutOrderByRule.check(createContext(sql));

    // The subquery has OFFSET without ORDER BY
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.severity).toBe("error");
  });

  it("allows OFFSET with FETCH and ORDER BY", () => {
    const sql =
      "SELECT * FROM [A] ORDER BY Id OFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY";
    const diagnostics = offsetWithoutOrderByRule.check(createContext(sql));

    expect(diagnostics).toHaveLength(0);
  });

  it("ignores OFFSET in string literal", () => {
    const sql = "SELECT 'OFFSET 10 ROWS' AS Example FROM [A]";
    const diagnostics = offsetWithoutOrderByRule.check(createContext(sql));

    expect(diagnostics).toHaveLength(0);
  });
});
