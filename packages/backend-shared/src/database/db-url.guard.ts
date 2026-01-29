import type { Sql } from "postgres";

const DEFAULT_MIGRATIONS_USERNAME = "qs_migrate";

/**
 * Superuser/admin role names that should never be used for application runtime.
 * These roles typically have elevated privileges (SUPERUSER, BYPASSRLS, etc.)
 * that would defeat row-level security.
 */
const BLOCKED_SUPERUSER_NAMES = new Set([
  "postgres",
  "admin",
  "root",
  "superuser",
  "rdsadmin", // AWS RDS admin
  "cloudsqladmin", // GCP Cloud SQL admin
  "azure_superuser", // Azure Database for PostgreSQL
]);

function getPostgresUsername(url: URL): string | null {
  return url.username ? decodeURIComponent(url.username) : null;
}

export function assertSafeRuntimeDatabaseUrl(connectionString: string): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const migrationsUsername =
    process.env.QS_DB_MIGRATE_USER?.trim() || DEFAULT_MIGRATIONS_USERNAME;
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error(
      "Refusing to start in production with an unparseable DATABASE_URL. " +
        "Provide a standard postgres://... URL with an explicit runtime user (e.g. qs_runtime).",
    );
  }

  const username =
    getPostgresUsername(url) ||
    process.env.PGUSER?.trim() ||
    process.env.POSTGRES_USER?.trim() ||
    null;

  if (!username) {
    throw new Error(
      "Refusing to start in production without an explicit DATABASE_URL user. " +
        "Set DATABASE_URL to include a dedicated runtime role (e.g. qs_runtime), or set PGUSER.",
    );
  }

  if (username === migrationsUsername) {
    throw new Error(
      `Refusing to start in production with DATABASE_URL user '${username}'. ` +
        `Use a runtime role for DATABASE_URL (e.g. 'qs_runtime'); reserve '${migrationsUsername}' for migrations/test cleanup only.`,
    );
  }

  if (BLOCKED_SUPERUSER_NAMES.has(username.toLowerCase())) {
    throw new Error(
      `Refusing to start in production with DATABASE_URL user '${username}'. ` +
        `Superuser/admin roles bypass row-level security. Use a dedicated runtime role (e.g. 'qs_runtime').`,
    );
  }
}

export async function assertSafeRuntimeDatabaseRole(sql: Sql): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const rows = await sql<
    Array<{ rolsuper: boolean | null; rolbypassrls: boolean | null }>
  >`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
  const row = rows[0];
  if (!row) {
    throw new Error(
      "Refusing to start in production: unable to verify database role privileges for current_user.",
    );
  }

  if (row.rolsuper || row.rolbypassrls) {
    throw new Error(
      "Refusing to start in production with a privileged DATABASE_URL role (SUPERUSER or BYPASSRLS). " +
        "Use a dedicated runtime role with RLS enforced (e.g. qs_runtime) and reserve privileged roles for migrations/maintenance only.",
    );
  }
}
