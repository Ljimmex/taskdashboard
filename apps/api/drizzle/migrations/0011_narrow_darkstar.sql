ALTER TABLE "subtasks" ADD COLUMN "assignee_id" text;--> statement-breakpoint
ALTER TABLE "subtasks" ADD COLUMN "depends_on" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "depends_on" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;