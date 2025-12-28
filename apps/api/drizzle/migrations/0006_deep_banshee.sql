CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'starter', 'professional', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trial', 'expired', 'cancelled', 'past_due');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'admin', 'member', 'guest');--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "workspace_role" DEFAULT 'member' NOT NULL,
	"invited_by" text,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "settings" SET DEFAULT '{"defaultLanguage":"pl","timezone":"Europe/Warsaw","dateFormat":"DD/MM/YYYY","timeFormat":"24h","weekStartsOn":"monday","currency":"PLN","notifications":{"email":true,"inApp":true}}'::jsonb;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "logo" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "website" varchar(500);--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "subscription_plan" "subscription_plan" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "subscription_status" "subscription_status" DEFAULT 'trial' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "billing_email" varchar(255);--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "max_members" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "max_projects" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "max_storage_gb" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "features" jsonb DEFAULT '{"customBranding":false,"advancedReporting":false,"apiAccess":false,"ssoEnabled":false,"prioritySupport":false}'::jsonb;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;