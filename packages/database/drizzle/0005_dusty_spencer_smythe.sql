CREATE TABLE "tenant_feature_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"feature_key" varchar NOT NULL,
	"enabled" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_feature_overrides_tenant_id_feature_key_unique" UNIQUE("tenant_id","feature_key")
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "subscription_tier" varchar DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "seat_limit" integer;--> statement-breakpoint
ALTER TABLE "tenant_feature_overrides" ADD CONSTRAINT "tenant_feature_overrides_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenant_feature_overrides_tenant_id_idx" ON "tenant_feature_overrides" USING btree ("tenant_id");