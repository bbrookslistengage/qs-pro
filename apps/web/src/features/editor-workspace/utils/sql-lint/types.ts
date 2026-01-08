import type { DataExtension } from "@/features/editor-workspace/types";
import type { SqlToken } from "../sql-context";

export type SqlDiagnosticSeverity = "error" | "warning" | "prereq";

export interface SqlDiagnostic {
  message: string;
  severity: SqlDiagnosticSeverity;
  startIndex: number;
  endIndex: number;
}

export interface LintContext {
  sql: string;
  tokens: SqlToken[];
  dataExtensions?: DataExtension[];
}

export interface LintRule {
  id: string;
  name: string;
  check: (context: LintContext) => SqlDiagnostic[];
}
