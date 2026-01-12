const MAX_INITIALS = 3;
const ABBREV_LENGTH = 4;

/**
 * Generates a smart alias for a SQL table name.
 * Returns null if no meaningful alias can be suggested.
 */
export function generateSmartAlias(
  tableName: string,
  existingAliases: Set<string>,
): string | null {
  const clean = tableName.replace(/^\[|\]$/g, "").trim();
  const words = clean.split(/(?=[A-Z])|[\s_-]+/).filter((w) => w.length > 0);

  const initials = words
    .slice(0, MAX_INITIALS)
    .map((w) => w[0]?.toLowerCase() || "")
    .join("");

  if (initials && !existingAliases.has(initials)) {
    return initials;
  }

  const abbreviated = clean.slice(0, ABBREV_LENGTH).toLowerCase();
  if (abbreviated && !existingAliases.has(abbreviated)) {
    return abbreviated;
  }

  return null;
}
