CREATE TABLE "shell_query_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"mid" varchar NOT NULL,
	"snippet_name" varchar,
	"sql_text_hash" varchar NOT NULL,
	"status" varchar DEFAULT 'queued' NOT NULL,
	"task_id" varchar,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tenant_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"mid" varchar NOT NULL,
	"qpp_folder_id" integer,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tenant_settings_tenant_id_mid_unique" UNIQUE("tenant_id","mid")
);
--> statement-breakpoint
ALTER TABLE "shell_query_runs" ADD CONSTRAINT "shell_query_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shell_query_runs" ADD CONSTRAINT "shell_query_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;