ALTER TABLE "roles" ALTER COLUMN "team_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "team_id" SET DATA TYPE uuid;