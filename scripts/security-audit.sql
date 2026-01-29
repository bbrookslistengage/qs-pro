-- Security Audit Queries for PostgreSQL RLS Configuration
-- Run against production database periodically to detect potential RLS bypass risks.
-- Usage: psql -d your_database -f scripts/security-audit.sql

\echo '=== SECURITY AUDIT REPORT ==='
\echo ''

-- 1. SECURITY DEFINER functions (run with creator's privileges, may bypass RLS)
\echo '--- SECURITY DEFINER Functions (potential RLS bypass) ---'
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_userbyid(p.proowner) AS owner,
  CASE WHEN r.rolsuper THEN 'YES' ELSE 'NO' END AS owner_is_superuser,
  CASE WHEN r.rolbypassrls THEN 'YES' ELSE 'NO' END AS owner_has_bypassrls
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_roles r ON p.proowner = r.oid
WHERE p.prosecdef = true
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, p.proname;

\echo ''

-- 2. Roles with BYPASSRLS attribute
\echo '--- Roles with BYPASSRLS Privilege ---'
SELECT
  rolname,
  CASE WHEN rolsuper THEN 'YES' ELSE 'NO' END AS is_superuser,
  CASE WHEN rolcanlogin THEN 'YES' ELSE 'NO' END AS can_login
FROM pg_roles
WHERE rolbypassrls = true
ORDER BY rolname;

\echo ''

-- 3. Tables without RLS enabled
\echo '--- Tables WITHOUT Row-Level Security Enabled ---'
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND (schemaname, tablename) NOT IN (
    SELECT schemaname, tablename
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    JOIN pg_namespace n ON n.nspname = t.schemaname AND c.relnamespace = n.oid
    WHERE c.relrowsecurity = true
  )
ORDER BY schemaname, tablename;

\echo ''

-- 4. Tables with RLS but without FORCE ROW LEVEL SECURITY
\echo '--- Tables with RLS but WITHOUT Force RLS (owners bypass) ---'
SELECT
  n.nspname AS schema,
  c.relname AS table_name,
  pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'r'
  AND c.relrowsecurity = true
  AND c.relforcerowsecurity = false
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, c.relname;

\echo ''

-- 5. Views owned by BYPASSRLS roles (views run with owner's privileges by default)
\echo '--- Views Owned by BYPASSRLS Roles (potential RLS bypass) ---'
SELECT
  n.nspname AS schema,
  c.relname AS view_name,
  pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_roles r ON c.relowner = r.oid
WHERE c.relkind = 'v'
  AND (r.rolbypassrls = true OR r.rolsuper = true)
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, c.relname;

\echo ''
\echo '=== END OF SECURITY AUDIT ==='
