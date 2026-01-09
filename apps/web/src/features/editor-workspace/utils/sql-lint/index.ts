import type { DataExtension } from "@/features/editor-workspace/types";
import { tokenizeSql } from "./utils/tokenizer";
import { prohibitedKeywordsRule } from "./rules/prohibited-keywords";
import { cteDetectionRule } from "./rules/cte-detection";
import { selectClauseRule } from "./rules/select-clause";
import { unbracketedNamesRule } from "./rules/unbracketed-names";
import { ambiguousFieldsRule } from "./rules/ambiguous-fields";
import { limitProhibitionRule } from "./rules/limit-prohibition";
import { offsetFetchProhibitionRule } from "./rules/offset-fetch-prohibition";
import { unsupportedFunctionsRule } from "./rules/unsupported-functions";
import { aggregateGroupingRule } from "./rules/aggregate-grouping";
import { commaValidationRule } from "./rules/comma-validation";
import { aliasInClauseRule } from "./rules/alias-in-clause";

export type {
  SqlDiagnostic,
  SqlDiagnosticSeverity,
  LintRule,
  LintContext,
} from "./types";

interface LintOptions {
  dataExtensions?: DataExtension[];
}

/**
 * All registered lint rules.
 */
const rules = [
  prohibitedKeywordsRule,
  cteDetectionRule,
  selectClauseRule,
  unbracketedNamesRule,
  ambiguousFieldsRule,
  limitProhibitionRule,
  offsetFetchProhibitionRule,
  unsupportedFunctionsRule,
  aggregateGroupingRule,
  commaValidationRule,
  aliasInClauseRule,
];

/**
 * Evaluates SQL for guardrails and structural validity.
 * Runs all registered lint rules and aggregates diagnostics.
 */
export const lintSql = (sql: string, options: LintOptions = {}) => {
  const tokens = tokenizeSql(sql);
  const context = {
    sql,
    tokens,
    dataExtensions: options.dataExtensions,
  };

  const diagnostics = rules.flatMap((rule) => rule.check(context));
  return diagnostics;
};
