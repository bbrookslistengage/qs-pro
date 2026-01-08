import type { LintRule, LintContext, SqlDiagnostic } from "../types";
import { createDiagnostic, isWordChar } from "../utils/helpers";

const PROHIBITED_KEYWORDS = new Set([
  "update",
  "delete",
  "insert",
  "drop",
  "alter",
  "truncate",
  "merge",
  "create",
  "exec",
  "execute",
  "grant",
  "revoke",
  "begin",
  "commit",
  "rollback",
  "savepoint",
  "cursor",
  "fetch",
  "open",
  "close",
  "deallocate",
  "backup",
  "restore",
  "kill",
]);

const PROCEDURAL_KEYWORDS = new Set([
  "declare",
  "set",
  "while",
  "print",
  "go",
  "if",
  "else",
  "return",
  "throw",
  "try",
  "catch",
  "waitfor",
  "raiserror",
]);

const getKeywordDiagnostics = (sql: string): SqlDiagnostic[] => {
  const diagnostics: SqlDiagnostic[] = [];
  let index = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBracket = false;
  let inLineComment = false;
  let inBlockComment = false;

  while (index < sql.length) {
    const char = sql[index];
    const nextChar = sql[index + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
      }
      index += 1;
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && nextChar === "/") {
        inBlockComment = false;
        index += 2;
        continue;
      }
      index += 1;
      continue;
    }

    if (inSingleQuote) {
      if (char === "'") {
        if (nextChar === "'") {
          index += 2;
          continue;
        }
        inSingleQuote = false;
      }
      index += 1;
      continue;
    }

    if (inDoubleQuote) {
      if (char === '"') {
        inDoubleQuote = false;
      }
      index += 1;
      continue;
    }

    if (inBracket) {
      if (char === "]") {
        inBracket = false;
      }
      index += 1;
      continue;
    }

    if (char === "-" && nextChar === "-") {
      inLineComment = true;
      index += 2;
      continue;
    }

    if (char === "/" && nextChar === "*") {
      inBlockComment = true;
      index += 2;
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      index += 1;
      continue;
    }

    if (char === '"') {
      inDoubleQuote = true;
      index += 1;
      continue;
    }

    if (char === "[") {
      inBracket = true;
      index += 1;
      continue;
    }

    if (char === "#") {
      const start = index;
      let end = index + 1;
      while (end < sql.length && isWordChar(sql[end])) {
        end += 1;
      }
      if (end > start + 1) {
        diagnostics.push(
          createDiagnostic(
            "Temp tables and CTEs are not officially supported and may cause failures. Use subqueries instead.",
            "warning",
            start,
            end,
          ),
        );
      }
      index = end;
      continue;
    }

    if (isWordChar(char)) {
      const start = index;
      let end = index + 1;
      while (end < sql.length && isWordChar(sql[end])) {
        end += 1;
      }
      const word = sql.slice(start, end).toLowerCase();

      if (PROHIBITED_KEYWORDS.has(word)) {
        diagnostics.push(
          createDiagnostic(
            "Not Supported: SFMC SQL only supports SELECT. Use the 'Run to Target' wizard for updates.",
            "error",
            start,
            end,
          ),
        );
      } else if (PROCEDURAL_KEYWORDS.has(word)) {
        diagnostics.push(
          createDiagnostic(
            "Variables and loops are not supported in Marketing Cloud.",
            "error",
            start,
            end,
          ),
        );
      }

      index = end;
      continue;
    }

    index += 1;
  }

  return diagnostics;
};

/**
 * Rule to detect prohibited DML/DDL keywords and procedural keywords.
 */
export const prohibitedKeywordsRule: LintRule = {
  id: "prohibited-keywords",
  name: "Prohibited Keywords",
  check: (context: LintContext) => {
    return getKeywordDiagnostics(context.sql);
  },
};
