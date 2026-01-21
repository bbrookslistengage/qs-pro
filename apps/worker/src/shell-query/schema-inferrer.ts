/**
 * Schema Inferrer - Infer temp DE column schema from query output
 *
 * Parses SELECT columns and determines appropriate MCE field types
 * based on the query expressions.
 */

import { AppError, ErrorCode } from "@qpp/backend-shared";
import { Parser } from "node-sql-parser";

import {
  buildTableAliasMap,
  type FieldDefinition,
  type MetadataFetcher,
} from "./query-analyzer";
import {
  type DataViewField,
  getSystemDataViewFields,
  isSystemDataView,
} from "./system-data-views";

const parser = new Parser();
const DIALECT = "transactsql";

export interface ColumnDefinition {
  Name: string;
  FieldType: string;
  MaxLength?: number;
  Scale?: number;
  Precision?: number;
  fromFunction?: boolean;
}

// Maps aggregate/function names to their return types
const AGGREGATE_TYPE_MAP = new Map<string, string>([
  ["COUNT", "Number"],
  ["SUM", "Number"],
  ["AVG", "Decimal"],
  ["STDEV", "Decimal"],
  ["STDEVP", "Decimal"],
  ["VAR", "Decimal"],
  ["VARP", "Decimal"],
]);

const STRING_FUNCTIONS = new Set([
  "CONCAT",
  "LEFT",
  "RIGHT",
  "UPPER",
  "LOWER",
  "LTRIM",
  "RTRIM",
  "TRIM",
  "SUBSTRING",
  "REPLACE",
  "STUFF",
  "REVERSE",
  "CHAR",
  "CHARINDEX",
  "LEN",
  "PATINDEX",
  "QUOTENAME",
  "REPLICATE",
  "SPACE",
  "STR",
  "STRING_AGG",
  "FORMAT",
  "CONCAT_WS",
]);

const DATE_FUNCTIONS = new Set([
  "GETDATE",
  "GETUTCDATE",
  "DATEADD",
  "DATEDIFF",
  "DATENAME",
  "DATEPART",
  "DAY",
  "MONTH",
  "YEAR",
  "EOMONTH",
  "DATEFROMPARTS",
  "DATETIMEFROMPARTS",
  "SYSDATETIME",
  "SYSUTCDATETIME",
  "CURRENT_TIMESTAMP",
  "SWITCHOFFSET",
  "TODATETIMEOFFSET",
]);

const NUMERIC_FUNCTIONS = new Set([
  "LEN",
  "DATALENGTH",
  "CHARINDEX",
  "PATINDEX",
  "DATEPART",
  "DATEDIFF",
  "DAY",
  "MONTH",
  "YEAR",
  "ISNUMERIC",
  "ABS",
  "CEILING",
  "FLOOR",
  "ROUND",
  "SIGN",
  "SQRT",
  "SQUARE",
  "POWER",
  "LOG",
  "LOG10",
  "EXP",
]);

interface FunctionNamePart {
  type: string;
  value: string;
}

interface FunctionName {
  name: FunctionNamePart[];
}

interface AstExpression {
  type?: string;
  value?: unknown;
  name?: string | FunctionName;
  args?: { value?: AstExpression[]; type?: string } | AstExpression[];
  column?: string | { expr: { type: string; value: string } };
  table?: string | null;
  left?: AstExpression;
  right?: AstExpression;
  target?: { dataType?: string; length?: number };
  expr?: AstExpression;
  cond?: AstExpression[];
  result?: AstExpression[];
}

interface SelectColumn {
  expr?: AstExpression;
  as?: string | null;
  type?: string;
  column?: string | { expr: { type: string; value: string } };
  table?: string | null;
}

interface AstStatement {
  type?: string;
  columns?: Array<SelectColumn | string>;
  from?: unknown;
}

function stripBrackets(name: string): string {
  if (name.startsWith("[") && name.endsWith("]")) {
    return name.slice(1, -1);
  }
  return name;
}

function extractFunctionName(name: string | FunctionName | undefined): string {
  if (!name) {
    return "";
  }
  if (typeof name === "string") {
    return name;
  }
  if (name.name && Array.isArray(name.name) && name.name.length > 0) {
    const firstPart = name.name[0];
    return firstPart?.value ?? "";
  }
  return "";
}

function getColumnName(col: SelectColumn | string, index: number): string {
  if (typeof col === "string") {
    return col === "*" ? `Column${index + 1}` : col;
  }

  if (col.as) {
    return typeof col.as === "string" ? col.as : `Column${index + 1}`;
  }

  if (col.type === "column_ref" && col.column) {
    if (typeof col.column === "string") {
      return stripBrackets(col.column);
    }
    if (col.column.expr?.value) {
      return String(col.column.expr.value);
    }
  }

  if (col.expr) {
    if (col.expr.type === "column_ref" && col.expr.column) {
      if (typeof col.expr.column === "string") {
        return stripBrackets(col.expr.column);
      }
      if (col.expr.column.expr?.value) {
        return String(col.expr.column.expr.value);
      }
    }

    if (col.expr.type === "aggr_func" || col.expr.type === "function") {
      const funcName = extractFunctionName(col.expr.name);
      return funcName || "Unknown";
    }
  }

  return `Column${index + 1}`;
}

async function inferColumnType(
  expr: AstExpression | undefined,
  aliasMap: Map<string, string>,
  metadataFn: MetadataFetcher,
): Promise<ColumnDefinition> {
  if (!expr) {
    return { Name: "Unknown", FieldType: "Text", MaxLength: 254 };
  }

  // Direct column reference
  if (expr.type === "column_ref") {
    const columnName =
      typeof expr.column === "string"
        ? stripBrackets(expr.column)
        : expr.column?.expr?.value
          ? String(expr.column.expr.value)
          : "Unknown";

    let tableName: string | null = null;
    if (expr.table) {
      const resolved = aliasMap.get(expr.table.toLowerCase());
      tableName = resolved ?? expr.table;
    }

    if (tableName) {
      const fieldType = await lookupFieldType(
        tableName,
        columnName,
        metadataFn,
      );
      if (fieldType) {
        return { Name: columnName, ...fieldType };
      }
    }

    // Try to find the column in any known table
    for (const table of aliasMap.values()) {
      const fieldType = await lookupFieldType(table, columnName, metadataFn);
      if (fieldType) {
        return { Name: columnName, ...fieldType };
      }
    }

    return { Name: columnName, FieldType: "Text", MaxLength: 254 };
  }

  // Aggregate function (COUNT, SUM, AVG, etc.)
  if (expr.type === "aggr_func") {
    const funcName = extractFunctionName(expr.name).toUpperCase();

    if (funcName === "COUNT") {
      return { Name: funcName, FieldType: "Number" };
    }

    if (funcName === "AVG") {
      return {
        Name: funcName,
        FieldType: "Decimal",
        Scale: 2,
        Precision: 18,
      };
    }

    if (funcName === "SUM") {
      return { Name: funcName, FieldType: "Number" };
    }

    if (funcName === "MIN" || funcName === "MAX") {
      const args = expr.args;
      if (args) {
        const argList = Array.isArray(args) ? args : (args.value ?? []);
        if (argList.length > 0) {
          const argType = await inferColumnType(
            argList[0] as AstExpression,
            aliasMap,
            metadataFn,
          );
          return { ...argType, Name: funcName };
        }
      }
      return { Name: funcName, FieldType: "Text", MaxLength: 254 };
    }

    const mappedType = AGGREGATE_TYPE_MAP.get(funcName);
    if (mappedType) {
      if (mappedType === "Decimal") {
        return {
          Name: funcName,
          FieldType: "Decimal",
          Scale: 2,
          Precision: 18,
        };
      }
      return { Name: funcName, FieldType: mappedType };
    }

    return { Name: funcName, FieldType: "Number" };
  }

  // Regular function
  if (expr.type === "function") {
    const funcName = extractFunctionName(expr.name).toUpperCase();

    if (STRING_FUNCTIONS.has(funcName)) {
      return {
        Name: funcName,
        FieldType: "Text",
        MaxLength: 4000,
        fromFunction: true,
      };
    }

    if (DATE_FUNCTIONS.has(funcName)) {
      // Some date functions return numbers
      if (["DAY", "MONTH", "YEAR", "DATEPART", "DATEDIFF"].includes(funcName)) {
        return { Name: funcName, FieldType: "Number" };
      }
      return { Name: funcName, FieldType: "Date" };
    }

    if (NUMERIC_FUNCTIONS.has(funcName)) {
      return { Name: funcName, FieldType: "Number" };
    }

    return {
      Name: funcName,
      FieldType: "Text",
      MaxLength: 4000,
      fromFunction: true,
    };
  }

  // CAST/CONVERT
  if (expr.type === "cast" || expr.type === "convert") {
    const targetType = expr.target?.dataType?.toUpperCase() ?? "";
    const length = expr.target?.length;

    if (
      targetType.includes("INT") ||
      targetType === "BIGINT" ||
      targetType === "SMALLINT" ||
      targetType === "TINYINT"
    ) {
      return { Name: "Cast", FieldType: "Number" };
    }

    if (
      targetType.includes("DECIMAL") ||
      targetType.includes("NUMERIC") ||
      targetType.includes("FLOAT") ||
      targetType.includes("REAL") ||
      targetType.includes("MONEY")
    ) {
      return { Name: "Cast", FieldType: "Decimal", Scale: 2, Precision: 18 };
    }

    if (
      targetType.includes("DATE") ||
      targetType.includes("TIME") ||
      targetType.includes("DATETIME")
    ) {
      return { Name: "Cast", FieldType: "Date" };
    }

    if (
      targetType.includes("CHAR") ||
      targetType.includes("VARCHAR") ||
      targetType.includes("TEXT") ||
      targetType.includes("NVARCHAR") ||
      targetType.includes("NCHAR")
    ) {
      return {
        Name: "Cast",
        FieldType: "Text",
        MaxLength: length ?? 254,
        fromFunction: true,
      };
    }

    if (targetType === "BIT") {
      return { Name: "Cast", FieldType: "Boolean" };
    }

    return {
      Name: "Cast",
      FieldType: "Text",
      MaxLength: 254,
      fromFunction: true,
    };
  }

  // CASE expression
  if (expr.type === "case") {
    const results = expr.result ?? [];
    if (results.length > 0) {
      const firstResult = await inferColumnType(
        results[0] as AstExpression,
        aliasMap,
        metadataFn,
      );
      return { ...firstResult, Name: "Case" };
    }
    return { Name: "Case", FieldType: "Text", MaxLength: 254 };
  }

  // Literal values
  if (expr.type === "string" || expr.type === "single_quote_string") {
    return { Name: "Literal", FieldType: "Text", MaxLength: 254 };
  }

  if (expr.type === "number") {
    const value = expr.value;
    if (typeof value === "number" && !Number.isInteger(value)) {
      return { Name: "Literal", FieldType: "Decimal", Scale: 2, Precision: 18 };
    }
    return { Name: "Literal", FieldType: "Number" };
  }

  if (expr.type === "bool") {
    return { Name: "Literal", FieldType: "Boolean" };
  }

  if (expr.type === "null") {
    return { Name: "Literal", FieldType: "Text", MaxLength: 254 };
  }

  // Binary expressions (arithmetic)
  if (expr.type === "binary_expr") {
    const leftType = await inferColumnType(expr.left, aliasMap, metadataFn);
    const rightType = await inferColumnType(expr.right, aliasMap, metadataFn);

    if (
      leftType.FieldType === "Number" ||
      rightType.FieldType === "Number" ||
      leftType.FieldType === "Decimal" ||
      rightType.FieldType === "Decimal"
    ) {
      if (
        leftType.FieldType === "Decimal" ||
        rightType.FieldType === "Decimal"
      ) {
        return {
          Name: "Expression",
          FieldType: "Decimal",
          Scale: 2,
          Precision: 18,
        };
      }
      return { Name: "Expression", FieldType: "Number" };
    }

    return { Name: "Expression", FieldType: "Text", MaxLength: 254 };
  }

  // Default fallback
  return { Name: "Unknown", FieldType: "Text", MaxLength: 254 };
}

async function lookupFieldType(
  tableName: string,
  columnName: string,
  metadataFn: MetadataFetcher,
): Promise<{ FieldType: string; MaxLength?: number } | null> {
  const normalizedTable = stripBrackets(tableName);

  let effectiveTableName = normalizedTable;
  if (normalizedTable.toLowerCase().startsWith("ent.")) {
    effectiveTableName = normalizedTable.substring(4);
  }

  // Check system data views first
  if (isSystemDataView(effectiveTableName)) {
    const fields = getSystemDataViewFields(effectiveTableName);
    const field = fields.find(
      (f: DataViewField) => f.Name.toLowerCase() === columnName.toLowerCase(),
    );
    if (field) {
      return { FieldType: field.FieldType, MaxLength: field.MaxLength };
    }
    return null;
  }

  // Try metadata fetcher - use effectiveTableName (with ENT. prefix stripped)
  const fields = await metadataFn.getFieldsForTable(effectiveTableName);
  if (fields) {
    const field = fields.find(
      (f: FieldDefinition) => f.Name.toLowerCase() === columnName.toLowerCase(),
    );
    if (field) {
      return { FieldType: field.FieldType, MaxLength: field.MaxLength };
    }
  }

  return null;
}

function sanitizeColumnName(name: string, existingNames: Set<string>): string {
  let sanitized = name;

  // Truncate names > 50 chars to first 45 chars
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 45);
  }

  // Handle duplicates
  let finalName = sanitized;
  let counter = 1;
  while (existingNames.has(finalName.toLowerCase())) {
    finalName = `${sanitized}_${counter}`;
    counter++;
  }

  existingNames.add(finalName.toLowerCase());
  return finalName;
}

function applyFieldPropertyMapping(col: ColumnDefinition): ColumnDefinition {
  const result = { ...col };

  switch (result.FieldType) {
    case "Text":
      if (result.fromFunction) {
        result.MaxLength = result.MaxLength ?? 4000;
      } else {
        result.MaxLength = result.MaxLength ?? 254;
      }
      break;
    case "Decimal":
      result.Scale = result.Scale ?? 2;
      result.Precision = result.Precision ?? 18;
      break;
    case "Number":
    case "Date":
    case "Boolean":
    case "Email":
    case "EmailAddress":
    case "Phone":
      // No extra properties needed
      break;
    default:
      // Unknown type - default to Text
      result.FieldType = "Text";
      result.MaxLength = 254;
  }

  // Clean up internal properties
  delete result.fromFunction;

  return result;
}

export async function inferSchema(
  sqlText: string,
  metadataFn: MetadataFetcher,
): Promise<ColumnDefinition[]> {
  let ast: AstStatement | AstStatement[];

  try {
    ast = parser.astify(sqlText, { database: DIALECT }) as unknown as
      | AstStatement
      | AstStatement[];
  } catch {
    throw new AppError(ErrorCode.SCHEMA_INFERENCE_FAILED);
  }

  const statements = Array.isArray(ast) ? ast : [ast];
  const columns: ColumnDefinition[] = [];
  const existingNames = new Set<string>();
  const aliasMap = buildTableAliasMap(sqlText);

  for (const stmt of statements) {
    if (stmt.type !== "select" || !stmt.columns) {
      continue;
    }

    for (let i = 0; i < stmt.columns.length; i++) {
      const col = stmt.columns.at(i);

      // Skip undefined entries
      if (col === undefined) {
        continue;
      }

      // Skip star columns (should be expanded before calling inferSchema)
      if (typeof col === "string" && col === "*") {
        continue;
      }
      if (
        typeof col === "object" &&
        col !== null &&
        "type" in col &&
        col.type === "star"
      ) {
        continue;
      }

      // Skip column_ref with column "*"
      if (
        typeof col === "object" &&
        col !== null &&
        "expr" in col &&
        col.expr &&
        col.expr.type === "column_ref" &&
        col.expr.column === "*"
      ) {
        continue;
      }

      const colName = getColumnName(col, i);
      const sanitizedName = sanitizeColumnName(colName, existingNames);

      let colDef: ColumnDefinition;

      if (typeof col === "object" && col !== null && "expr" in col) {
        colDef = await inferColumnType(
          col.expr as AstExpression,
          aliasMap,
          metadataFn,
        );
        colDef.Name = sanitizedName;
      } else if (
        typeof col === "object" &&
        col !== null &&
        "type" in col &&
        col.type === "column_ref"
      ) {
        colDef = await inferColumnType(
          col as unknown as AstExpression,
          aliasMap,
          metadataFn,
        );
        colDef.Name = sanitizedName;
      } else {
        colDef = {
          Name: sanitizedName,
          FieldType: "Text",
          MaxLength: 254,
        };
      }

      columns.push(applyFieldPropertyMapping(colDef));
    }
  }

  if (columns.length === 0) {
    throw new AppError(ErrorCode.SCHEMA_INFERENCE_FAILED);
  }

  return columns;
}

export function inferColumnTypeFromMetadata(
  metadataType: string,
): ColumnDefinition {
  const typeUpper = (metadataType || "").toUpperCase();

  if (
    typeUpper === "NUMBER" ||
    typeUpper === "INT" ||
    typeUpper === "INTEGER"
  ) {
    return { Name: "", FieldType: "Number" };
  }

  if (
    typeUpper === "DECIMAL" ||
    typeUpper === "FLOAT" ||
    typeUpper === "DOUBLE"
  ) {
    return { Name: "", FieldType: "Decimal", Scale: 2, Precision: 18 };
  }

  if (typeUpper === "DATE" || typeUpper === "DATETIME") {
    return { Name: "", FieldType: "Date" };
  }

  if (typeUpper === "BOOLEAN" || typeUpper === "BOOL" || typeUpper === "BIT") {
    return { Name: "", FieldType: "Boolean" };
  }

  if (typeUpper === "EMAIL" || typeUpper === "EMAILADDRESS") {
    return { Name: "", FieldType: "EmailAddress" };
  }

  if (typeUpper === "PHONE") {
    return { Name: "", FieldType: "Phone" };
  }

  // Default to Text
  return { Name: "", FieldType: "Text", MaxLength: 254 };
}
