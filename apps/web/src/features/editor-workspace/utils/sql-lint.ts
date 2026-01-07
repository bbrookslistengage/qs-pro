import type { DataExtension } from "@/features/editor-workspace/types";
import type { SqlDiagnostic } from "./sql-diagnostics";
import { extractTableReferences, tokenizeSql } from "./sql-context";

interface LintOptions {
  dataExtensions?: DataExtension[];
}

const PROHIBITED_KEYWORDS = new Set([
  "update",
  "delete",
  "insert",
  "drop",
  "alter",
  "truncate",
  "merge",
]);

const PROCEDURAL_KEYWORDS = new Set(["declare", "set", "while", "print", "go"]);

const isWordChar = (value: string) => /[A-Za-z0-9_]/.test(value);

const createDiagnostic = (
  message: string,
  severity: SqlDiagnostic["severity"],
  startIndex: number,
  endIndex: number,
): SqlDiagnostic => ({
  message,
  severity,
  startIndex,
  endIndex,
});

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
      } else if (word === "with") {
        const rest = sql.slice(end);
        if (/\bAS\s*\(/i.test(rest)) {
          diagnostics.push(
            createDiagnostic(
              "Temp tables and CTEs are not officially supported and may cause failures. Use subqueries instead.",
              "warning",
              start,
              end,
            ),
          );
        }
      }

      index = end;
      continue;
    }

    index += 1;
  }

  return diagnostics;
};

const getUnbracketedSpaceWarnings = (
  sql: string,
  dataExtensions?: DataExtension[],
) => {
  if (!dataExtensions || dataExtensions.length === 0) return [];
  const spaceNames = new Set(
    dataExtensions
      .map((de) => de.name.trim())
      .filter((name) => name.includes(" "))
      .map((name) => name.toLowerCase()),
  );

  if (spaceNames.size === 0) return [];

  return extractTableReferences(sql)
    .filter((reference) => !reference.isSubquery)
    .filter((reference) => !reference.isBracketed)
    .map((reference) => {
      const candidate = reference.alias
        ? `${reference.name} ${reference.alias}`
        : reference.name;
      return {
        reference,
        candidate: candidate.toLowerCase(),
      };
    })
    .filter(({ candidate }) => spaceNames.has(candidate))
    .map(({ reference }) =>
      createDiagnostic(
        "Data Extension names with spaces must be wrapped in brackets.",
        "warning",
        reference.startIndex,
        reference.endIndex,
      ),
    );
};

const splitSelectExpressions = (clause: string) => {
  const expressions: string[] = [];
  let current = "";
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBracket = false;

  for (let index = 0; index < clause.length; index += 1) {
    const char = clause[index];
    const nextChar = clause[index + 1];

    if (inSingleQuote) {
      current += char;
      if (char === "'" && nextChar === "'") {
        current += nextChar;
        index += 1;
        continue;
      }
      if (char === "'") {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      current += char;
      if (char === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (inBracket) {
      current += char;
      if (char === "]") {
        inBracket = false;
      }
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      current += char;
      continue;
    }

    if (char === '"') {
      inDoubleQuote = true;
      current += char;
      continue;
    }

    if (char === "[") {
      inBracket = true;
      current += char;
      continue;
    }

    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);

    if (char === "," && depth === 0) {
      if (current.trim()) {
        expressions.push(current.trim());
      }
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    expressions.push(current.trim());
  }

  return expressions;
};

const isLiteralExpression = (expression: string) => {
  return /^\s*('([^']|'')*'|\d+(\.\d+)?|true|false|null)\s*(as\s+)?\[?[A-Za-z0-9_\s]+\]?\s*$/i.test(
    expression,
  );
};

const hasAlias = (expression: string) => {
  if (/\bas\s+\[?[A-Za-z0-9_\s]+\]?\s*$/i.test(expression)) return true;
  return /\s+\[?[A-Za-z0-9_\s]+\]?\s*$/i.test(expression);
};

const normalizeIdentifier = (value: string) => {
  return value
    .replace(/^\[|\]$/g, "")
    .trim()
    .toLowerCase();
};

const getSelectClauseTokens = (sql: string) => {
  const tokens = tokenizeSql(sql);
  const selectIndex = tokens.findIndex(
    (token) => token.type === "word" && token.value.toLowerCase() === "select",
  );
  if (selectIndex === -1) return [];
  const selectToken = tokens[selectIndex];
  const fromIndex = tokens.findIndex(
    (token, index) =>
      index > selectIndex &&
      token.type === "word" &&
      token.value.toLowerCase() === "from" &&
      token.depth === selectToken.depth,
  );
  const endIndex = fromIndex === -1 ? tokens.length : fromIndex;
  return tokens.slice(selectIndex + 1, endIndex);
};

const getUnqualifiedFieldTokens = (sql: string) => {
  const tokens = getSelectClauseTokens(sql);
  const candidates: { token: SqlToken; index: number }[] = [];

  tokens.forEach((token, index) => {
    if (token.type !== "word" && token.type !== "bracket") return;
    const value = token.value.toLowerCase();
    if (value === "as" || value === "*" || value === "distinct") return;
    if (["select", "from", "where", "group", "order", "having"].includes(value))
      return;

    const prev = tokens[index - 1];
    const next = tokens[index + 1];
    if (prev?.type === "symbol" && prev.value === ".") return;
    if (next?.type === "symbol" && next.value === ".") return;
    if (prev?.type === "word" && prev.value.toLowerCase() === "as") return;
    if (next?.type === "symbol" && next.value === "(") return;

    candidates.push({ token, index });
  });

  return candidates.map((candidate) => candidate.token);
};

const getAmbiguousFieldDiagnostics = (
  sql: string,
  dataExtensions?: DataExtension[],
) => {
  if (!dataExtensions || dataExtensions.length === 0) return [];

  const references = extractTableReferences(sql).filter(
    (reference) => !reference.isSubquery,
  );
  if (references.length < 2) return [];

  const referenceFields = references
    .map((reference) => {
      const dataExtension = dataExtensions.find((de) => {
        const name = normalizeIdentifier(de.name);
        const key = normalizeIdentifier(de.customerKey);
        const table = normalizeIdentifier(reference.name);
        return name === table || key === table;
      });
      return {
        reference,
        fields: new Set(
          dataExtension?.fields.map((field) =>
            normalizeIdentifier(field.name),
          ) ?? [],
        ),
      };
    })
    .filter((entry) => entry.fields.size > 0);

  if (referenceFields.length < 2) return [];

  const ambiguousFields = new Set<string>();
  const tokens = getUnqualifiedFieldTokens(sql);
  tokens.forEach((token) => {
    const fieldName = normalizeIdentifier(token.value);
    const matches = referenceFields.filter((entry) =>
      entry.fields.has(fieldName),
    );
    if (matches.length >= 2) {
      ambiguousFields.add(fieldName);
    }
  });

  if (ambiguousFields.size === 0) return [];

  return tokens
    .filter((token) => ambiguousFields.has(normalizeIdentifier(token.value)))
    .map((token) =>
      createDiagnostic(
        `Ambiguous field "${token.value}" across multiple Data Extensions. Add table aliases and qualify fields.`,
        "error",
        token.startIndex,
        token.endIndex,
      ),
    );
};

const getSelectDiagnostics = (sql: string): SqlDiagnostic[] => {
  const diagnostics: SqlDiagnostic[] = [];
  const tokens = tokenizeSql(sql);
  const selectToken = tokens.find(
    (token) => token.type === "word" && token.value.toLowerCase() === "select",
  );
  if (!selectToken) {
    diagnostics.push(
      createDiagnostic(
        "Query must include a SELECT statement.",
        "prereq",
        0,
        Math.min(6, sql.length),
      ),
    );
    return diagnostics;
  }

  const fromToken = tokens.find(
    (token) =>
      token.type === "word" &&
      token.value.toLowerCase() === "from" &&
      token.startIndex > selectToken.startIndex,
  );
  const clauseStart = selectToken.endIndex;
  const clauseEnd = fromToken ? fromToken.startIndex : sql.length;
  const clause = sql.slice(clauseStart, clauseEnd).trim();

  if (!clause) {
    diagnostics.push(
      createDiagnostic(
        "SELECT must include at least one field or expression.",
        "prereq",
        selectToken.startIndex,
        selectToken.endIndex,
      ),
    );
    return diagnostics;
  }

  const expressions = splitSelectExpressions(clause);
  if (expressions.length === 0) {
    diagnostics.push(
      createDiagnostic(
        "SELECT must include at least one field or expression.",
        "prereq",
        selectToken.startIndex,
        selectToken.endIndex,
      ),
    );
    return diagnostics;
  }

  const nonLiteralExpressions = expressions.filter(
    (expression) => !isLiteralExpression(expression),
  );
  const literalWithoutAlias = expressions.some(
    (expression) => isLiteralExpression(expression) && !hasAlias(expression),
  );

  if (literalWithoutAlias) {
    diagnostics.push(
      createDiagnostic(
        "Literal SELECT expressions must include an alias.",
        "error",
        clauseStart,
        clauseEnd,
      ),
    );
  }

  const hasFrom = Boolean(fromToken);
  if (!hasFrom && nonLiteralExpressions.length > 0) {
    diagnostics.push(
      createDiagnostic(
        "SELECT fields require a FROM clause.",
        "prereq",
        clauseStart,
        clauseEnd,
      ),
    );
    return diagnostics;
  }

  if (hasFrom) {
    const references = extractTableReferences(sql).filter(
      (reference) => !reference.isSubquery,
    );
    if (references.length === 0 && nonLiteralExpressions.length > 0) {
      diagnostics.push(
        createDiagnostic(
          "FROM clause must include a Data Extension.",
          "prereq",
          fromToken.startIndex,
          fromToken.endIndex,
        ),
      );
    }
  }

  return diagnostics;
};

/**
 * Evaluates SQL for guardrails and structural validity.
 */
export const lintSql = (sql: string, options: LintOptions = {}) => {
  const diagnostics = getKeywordDiagnostics(sql);
  const spaceWarnings = getUnbracketedSpaceWarnings(
    sql,
    options.dataExtensions,
  );
  const selectDiagnostics = getSelectDiagnostics(sql);
  const ambiguousDiagnostics = getAmbiguousFieldDiagnostics(
    sql,
    options.dataExtensions,
  );
  return [
    ...diagnostics,
    ...spaceWarnings,
    ...selectDiagnostics,
    ...ambiguousDiagnostics,
  ];
};
