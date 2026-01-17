-- Custom SQL migration file, put your code below! --

-- Tighten RLS policy on shell_query_runs to also scope by MID.
-- NOTE: This assumes RLS is already enabled and the base policy exists (see 0008_rls_shell_query_runs.sql).
DROP POLICY IF EXISTS "shell_query_runs_user_isolation" ON "shell_query_runs";

CREATE POLICY "shell_query_runs_user_isolation"
  ON "shell_query_runs"
  USING (
    "tenant_id"::text = current_setting('app.tenant_id', true)
    AND "mid"::text = current_setting('app.mid', true)
    AND "user_id"::text = current_setting('app.user_id', true)
  )
  WITH CHECK (
    "tenant_id"::text = current_setting('app.tenant_id', true)
    AND "mid"::text = current_setting('app.mid', true)
    AND "user_id"::text = current_setting('app.user_id', true)
  );
