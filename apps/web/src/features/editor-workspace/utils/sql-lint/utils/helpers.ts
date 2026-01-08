import type { SqlDiagnostic } from "../types";

/**
 * Creates a diagnostic object with the specified message, severity, and position.
 */
export const createDiagnostic = (
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

/**
 * Checks if a character is a word character (letter, number, or underscore).
 */
export const isWordChar = (value: string) => /[A-Za-z0-9_]/.test(value);
