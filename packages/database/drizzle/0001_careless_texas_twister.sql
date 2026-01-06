ALTER TABLE "credentials" DROP CONSTRAINT "credentials_user_id_tenant_id_unique";--> statement-breakpoint
ALTER TABLE "credentials" ADD COLUMN "mid" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_tenant_id_mid_unique" UNIQUE("user_id","tenant_id","mid");