ALTER TABLE "time_entries" ALTER COLUMN "task_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ALTER COLUMN "description" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "workspace_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;