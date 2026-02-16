ALTER TABLE "tasks" RENAME COLUMN "assignee_id" TO "assignees";--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_assignee_id_users_id_fk";
