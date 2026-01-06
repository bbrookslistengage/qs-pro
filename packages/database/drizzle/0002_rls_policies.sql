-- Tenant/BU isolation via Postgres RLS.
--
-- The app must set these per request/session connection:
--   SELECT set_config('app.tenant_id', '<tenant_uuid>', false);
--   SELECT set_config('app.mid', '<mid>', false);

-- Optional hardening: make tenant/user ids non-null (only safe if no NULL rows exist).
ALTER TABLE "query_history"
  ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "snippets"
  ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "credentials"
  ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "credentials"
  ALTER COLUMN "user_id" SET NOT NULL;

-- Enable + enforce RLS
ALTER TABLE "query_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "query_history" FORCE ROW LEVEL SECURITY;

ALTER TABLE "snippets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "snippets" FORCE ROW LEVEL SECURITY;

ALTER TABLE "credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credentials" FORCE ROW LEVEL SECURITY;

-- Tenant isolation policies
DROP POLICY IF EXISTS "query_history_tenant_isolation" ON "query_history";
CREATE POLICY "query_history_tenant_isolation"
  ON "query_history"
  USING ("tenant_id"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS "snippets_tenant_isolation" ON "snippets";
CREATE POLICY "snippets_tenant_isolation"
  ON "snippets"
  USING ("tenant_id"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.tenant_id', true));

-- Tenant + BU isolation for credentials
DROP POLICY IF EXISTS "credentials_tenant_bu_isolation" ON "credentials";
CREATE POLICY "credentials_tenant_bu_isolation"
  ON "credentials"
  USING (
    "tenant_id"::text = current_setting('app.tenant_id', true)
    AND "mid"::text = current_setting('app.mid', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.tenant_id', true)
    AND "mid"::text = current_setting('app.mid', true)
  );
