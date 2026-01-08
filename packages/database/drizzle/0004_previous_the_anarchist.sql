CREATE INDEX "shell_query_runs_tenant_id_idx" ON "shell_query_runs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "shell_query_runs_status_idx" ON "shell_query_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shell_query_runs_created_at_idx" ON "shell_query_runs" USING btree ("created_at");