import { describe, expect, it } from "vitest";

import type { LintContext } from "../types";
import { unmatchedDelimitersRule } from "./unmatched-delimiters";

const createContext = (sql: string): LintContext => ({ sql, tokens: [] });

describe("unmatchedDelimitersRule", () => {
  it("flags unclosed brackets", () => {
    const diagnostics = unmatchedDelimitersRule.check(
      createContext("SELECT * FROM [A"),
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.severity).toBe("error");
    expect(diagnostics[0]?.message).toContain("Unclosed bracket");
  });

  it("does not flag balanced brackets", () => {
    const diagnostics = unmatchedDelimitersRule.check(
      createContext("SELECT * FROM [A]"),
    );

    expect(diagnostics).toHaveLength(0);
  });

  it("handles nested parentheses all matched", () => {
    const diagnostics = unmatchedDelimitersRule.check(
      createContext("SELECT CONCAT(UPPER(LEFT([A], 1)), '.')"),
    );

    expect(diagnostics).toHaveLength(0);
  });

  it("flags deeply nested unmatched parentheses", () => {
    const diagnostics = unmatchedDelimitersRule.check(
      createContext("SELECT CONCAT((LEFT([A], 1)"),
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.severity).toBe("error");
    expect(diagnostics[0]?.message).toContain("Unclosed parenthesis");
  });

  it("handles mixed bracket types valid", () => {
    const diagnostics = unmatchedDelimitersRule.check(
      createContext("SELECT [Field] FROM (SELECT * FROM [A]) sub"),
    );

    expect(diagnostics).toHaveLength(0);
  });

  it("ignores brackets inside string literals", () => {
    const diagnostics = unmatchedDelimitersRule.check(
      createContext("SELECT '(' AS OpenParen FROM [A]"),
    );

    expect(diagnostics).toHaveLength(0);
  });

  it("flags unclosed parenthesis with nested brackets", () => {
    const diagnostics = unmatchedDelimitersRule.check(
      createContext("SELECT * FROM ([A]"),
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.severity).toBe("error");
    expect(diagnostics[0]?.message).toContain("Unclosed parenthesis");
  });
});
