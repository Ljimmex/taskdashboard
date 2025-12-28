ALTER TABLE "public"."roles" ALTER COLUMN "level" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."role_level";--> statement-breakpoint
CREATE TYPE "public"."role_level" AS ENUM('owner', 'admin', 'project_manager', 'hr_manager', 'member', 'team_lead', 'senior', 'mid', 'junior', 'intern');--> statement-breakpoint
ALTER TABLE "public"."roles" ALTER COLUMN "level" SET DATA TYPE "public"."role_level" USING "level"::"public"."role_level";