import type {
  DataExtension,
  DataExtensionField,
} from "@/features/editor-workspace/types";
import type { SqlTableReference } from "./sql-context";

export interface DataExtensionSuggestion {
  label: string;
  insertText: string;
  customerKey: string;
  name: string;
  isShared: boolean;
}

export interface FieldSuggestion {
  label: string;
  insertText: string;
  detail?: string;
}

const normalize = (value: string) => value.trim().toLowerCase();

export const fuzzyMatch = (term: string, candidate: string) => {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return true;
  const normalizedCandidate = normalize(candidate);
  let termIndex = 0;

  for (let i = 0; i < normalizedCandidate.length; i += 1) {
    if (normalizedCandidate[i] === normalizedTerm[termIndex]) {
      termIndex += 1;
      if (termIndex >= normalizedTerm.length) return true;
    }
  }

  return false;
};

const toBracketed = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) return trimmed;
  return `[${trimmed}]`;
};

export const buildDataExtensionSuggestions = (
  dataExtensions: DataExtension[],
  sharedFolderIds: Set<string>,
  searchTerm: string,
): DataExtensionSuggestion[] => {
  const normalizedTerm = normalize(searchTerm.replace(/^ent\./i, ""));

  return dataExtensions
    .filter((de) => {
      const name = de.name ?? "";
      const key = de.customerKey ?? "";
      return (
        fuzzyMatch(normalizedTerm, name) || fuzzyMatch(normalizedTerm, key)
      );
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    )
    .map((de) => {
      const isShared = sharedFolderIds.has(de.folderId);
      const bracketedName = toBracketed(de.name);
      const label = isShared ? `ENT.${bracketedName}` : bracketedName;
      const insertText = isShared ? `ENT.${bracketedName}` : bracketedName;
      return {
        label,
        insertText,
        customerKey: de.customerKey,
        name: de.name,
        isShared,
      };
    });
};

const formatFieldType = (field: DataExtensionField) => {
  if (typeof field.length === "number") {
    return `${field.type}(${field.length})`;
  }
  return field.type;
};

export const buildFieldSuggestions = (
  fields: DataExtensionField[],
  options: { prefix?: string; ownerLabel?: string } = {},
): FieldSuggestion[] => {
  const { prefix, ownerLabel } = options;
  return fields
    .map((field) => {
      const baseName = field.name.includes(" ")
        ? toBracketed(field.name)
        : field.name;
      const insertText = prefix ? `${prefix}.${baseName}` : baseName;
      return {
        label: `${field.name} - ${formatFieldType(field)}`,
        insertText,
        detail: ownerLabel ? `Field • ${ownerLabel}` : "Field",
      };
    })
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
    );
};

export const resolveTableForAlias = (
  alias: string,
  tables: SqlTableReference[],
) => {
  const normalized = normalize(alias);
  return tables.find((table) => table.alias?.toLowerCase() === normalized);
};

export const getPrimaryTable = (tables: SqlTableReference[]) => {
  if (tables.length === 0) return null;
  const direct = tables.find((table) => !table.isSubquery);
  return direct ?? tables[0] ?? null;
};
