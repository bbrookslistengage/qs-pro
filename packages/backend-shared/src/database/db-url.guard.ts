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

function getPostgresUsername(connectionString: string): string | null {
  try {
    const url = new URL(connectionString);
    return url.username ? decodeURIComponent(url.username) : null;
  } catch {
    return null;
  }
}

export function assertSafeRuntimeDatabaseUrl(connectionString: string): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const migrationsUsername =
    process.env.QS_DB_MIGRATE_USER?.trim() || DEFAULT_MIGRATIONS_USERNAME;
  const username = getPostgresUsername(connectionString);

  if (!username) {
    return;
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
