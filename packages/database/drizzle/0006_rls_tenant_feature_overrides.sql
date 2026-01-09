-- Enable RLS on tenant_feature_overrides for defense-in-depth tenant isolation
ALTER TABLE "tenant_feature_overrides" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_feature_overrides" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_feature_overrides_tenant_isolation"
  ON "tenant_feature_overrides"
  USING ("tenant_id"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.tenant_id', true));
