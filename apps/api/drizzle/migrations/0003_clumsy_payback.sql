ALTER TABLE "time_entries" ALTER COLUMN "task_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ALTER COLUMN "duration_minutes" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "entry_type" varchar(20) DEFAULT 'task' NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "project_role" varchar(30) DEFAULT 'participant' NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "difficulty_level" varchar(20) DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "approval_status" varchar(20) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "rejection_reason" varchar(500);--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "bonus_points" integer;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;