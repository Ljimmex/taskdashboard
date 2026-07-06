-- Migration: Add owner override columns to workspaces (idempotent)
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "is_owner_override" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "override_plan" varchar(50);