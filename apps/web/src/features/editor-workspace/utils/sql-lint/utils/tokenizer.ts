import { tokenizeSql as tokenizeSqlFromContext } from "../../sql-context";

/**
 * Tokenizes SQL into a stream of tokens with type, value, position, and depth.
 * Re-exports the shared tokenization utility from sql-context.
 */
export const tokenizeSql = tokenizeSqlFromContext;
