CREATE TYPE "public"."member_status" AS ENUM('active', 'invited', 'suspended');--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "status" "member_status" DEFAULT 'active' NOT NULL;