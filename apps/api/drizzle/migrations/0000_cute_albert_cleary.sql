CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'member');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'pending');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('active', 'invited', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'starter', 'professional', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trial', 'expired', 'cancelled', 'past_due');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'admin', 'project_manager', 'hr_manager', 'member', 'guest');--> statement-breakpoint
CREATE TYPE "public"."team_level" AS ENUM('team_lead', 'senior', 'mid', 'junior', 'intern');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('pending', 'active', 'on_hold', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('created', 'updated', 'status_changed', 'assigned', 'commented', 'label_added', 'label_removed', 'time_logged', 'archived', 'restored', 'subtask_created', 'subtask_updated', 'subtask_deleted');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'review', 'done');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('task', 'meeting');--> statement-breakpoint
CREATE TYPE "public"."conversation_type" AS ENUM('direct', 'group', 'channel');--> statement-breakpoint
CREATE TYPE "public"."calendar_event_type" AS ENUM('event', 'task', 'meeting', 'reminder');--> statement-breakpoint
CREATE TYPE "public"."webhook_queue_status" AS ENUM('pending', 'processing', 'failed', 'completed');--> statement-breakpoint
CREATE TYPE "public"."webhook_type" AS ENUM('generic', 'discord', 'slack');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "two_factors" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "two_factors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" varchar(255),
	"image" text,
	"phone_number" varchar(20),
	"phone_number_verified" boolean DEFAULT false NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"description" text,
	"birth_date" timestamp,
	"gender" varchar(50),
	"position" varchar(100),
	"city" varchar(100),
	"country" varchar(100),
	"timezone" varchar(100),
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"status" "user_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"email" varchar(255),
	"token" varchar(255) NOT NULL,
	"role" "workspace_role" DEFAULT 'member' NOT NULL,
	"invited_by" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"allowed_domains" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	CONSTRAINT "workspace_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "workspace_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "workspace_role" DEFAULT 'member' NOT NULL,
	"status" "member_status" DEFAULT 'active' NOT NULL,
	"invited_by" text,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"logo" text,
	"website" varchar(500),
	"industry" varchar(100),
	"team_size" varchar(50),
	"owner_id" text NOT NULL,
	"subscription_plan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"subscription_status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"trial_ends_at" timestamp,
	"billing_email" varchar(255),
	"max_members" integer DEFAULT 5 NOT NULL,
	"max_projects" integer DEFAULT 3 NOT NULL,
	"max_storage_gb" integer DEFAULT 1 NOT NULL,
	"features" jsonb DEFAULT '{"customBranding":false,"advancedReporting":false,"apiAccess":false,"ssoEnabled":false,"prioritySupport":false}'::jsonb,
	"settings" jsonb DEFAULT '{"defaultLanguage":"pl","timezone":"Europe/Warsaw","dateFormat":"DD/MM/YYYY","timeFormat":"24h","weekStartsOn":"monday","currency":"PLN","notifications":{"email":true,"inApp":true}}'::jsonb,
	"labels" jsonb DEFAULT '[{"id":"bug","name":"Bug","color":"#ef4444"},{"id":"feature","name":"Feature","color":"#10b981"},{"id":"frontend","name":"Frontend","color":"#3b82f6"},{"id":"backend","name":"Backend","color":"#8b5cf6"},{"id":"urgent","name":"Pilne","color":"#f97316"},{"id":"docs","name":"Dokumentacja","color":"#6b7280"}]'::jsonb,
	"priorities" jsonb DEFAULT '[{"id":"low","name":"Low","color":"#6b7280","position":0},{"id":"medium","name":"Medium","color":"#3b82f6","position":1},{"id":"high","name":"High","color":"#f59e0b","position":2},{"id":"urgent","name":"Urgent","color":"#ef4444","position":3}]'::jsonb,
	"default_industry_template_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"team_level" "team_level" DEFAULT 'junior' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"avatar_url" text,
	"color" varchar(7) DEFAULT '#3B82F6' NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "industry_template_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_en" varchar(100),
	"color" varchar(7) DEFAULT '#6B7280' NOT NULL,
	"position" integer NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "industry_template_stages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "industry_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_en" varchar(100),
	"description" text,
	"icon" varchar(10),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "industry_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "industry_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7) DEFAULT '#6B7280' NOT NULL,
	"position" integer NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_stages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"industry_template_id" uuid,
	"name" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(7) DEFAULT '#F87171' NOT NULL,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"start_date" timestamp,
	"deadline" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "subtasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "task_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"old_value" text,
	"new_value" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" uuid,
	"content" text NOT NULL,
	"likes" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "task_comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" "task_type" DEFAULT 'task' NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"assignee_id" text,
	"reporter_id" text NOT NULL,
	"start_date" timestamp,
	"due_date" timestamp,
	"meeting_link" varchar(512),
	"estimated_hours" integer,
	"progress" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"labels" text[] DEFAULT '{}',
	"links" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"description" varchar(255),
	"duration_minutes" integer NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"path" text NOT NULL,
	"size" integer,
	"mime_type" varchar(127),
	"file_type" varchar(20),
	"r2_key" text,
	"thumbnail_url" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"workspace_id" text,
	"folder_id" text,
	"uploaded_by" text,
	"team_id" uuid,
	"task_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid,
	"workspace_id" text,
	"name" varchar(100),
	"description" text,
	"type" "conversation_type" DEFAULT 'direct' NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb,
	"participants" jsonb DEFAULT '[]'::jsonb,
	"participant_states" jsonb DEFAULT '{}'::jsonb,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "encryption_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"public_key" text NOT NULL,
	"encrypted_private_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"rotated_at" timestamp,
	"expires_at" timestamp,
	CONSTRAINT "encryption_keys_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
ALTER TABLE "encryption_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"recurrence" jsonb,
	"task_id" uuid,
	"team_ids" uuid[] NOT NULL,
	"type" "calendar_event_type" DEFAULT 'event' NOT NULL,
	"meeting_link" varchar(512),
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "saved_filters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"filters" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_filters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "task_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"template_data" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "folders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"workspace_id" text NOT NULL,
	"parent_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by_id" text
);
--> statement-breakpoint
ALTER TABLE "folders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" uuid NOT NULL,
	"event" text NOT NULL,
	"payload" jsonb NOT NULL,
	"request_headers" jsonb,
	"response_status" integer,
	"response_body" text,
	"duration_ms" integer,
	"attempt_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "webhook_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" uuid NOT NULL,
	"event" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "webhook_queue_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_run_at" timestamp DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhook_queue" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"url" text NOT NULL,
	"type" "webhook_type" DEFAULT 'generic' NOT NULL,
	"secret" text NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"silent_mode" boolean DEFAULT false NOT NULL,
	"description" text,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhooks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industry_template_stages" ADD CONSTRAINT "industry_template_stages_template_id_industry_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."industry_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_industry_template_id_industry_templates_id_fk" FOREIGN KEY ("industry_template_id") REFERENCES "public"."industry_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity_log" ADD CONSTRAINT "task_activity_log_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity_log" ADD CONSTRAINT "task_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encryption_keys" ADD CONSTRAINT "encryption_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_queue" ADD CONSTRAINT "webhook_queue_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "Users can view own accounts" ON "accounts" AS PERMISSIVE FOR SELECT TO public USING (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Users can delete own accounts" ON "accounts" AS PERMISSIVE FOR DELETE TO public USING (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Users can view own sessions" ON "sessions" AS PERMISSIVE FOR SELECT TO public USING (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Users can delete own sessions" ON "sessions" AS PERMISSIVE FOR DELETE TO public USING (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Users can view own two factor" ON "two_factors" AS PERMISSIVE FOR SELECT TO public USING (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Users can update own two factor" ON "two_factors" AS PERMISSIVE FOR UPDATE TO public USING (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Users can insert own two factor" ON "two_factors" AS PERMISSIVE FOR INSERT TO public WITH CHECK (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Backend can manage verifications" ON "verifications" AS PERMISSIVE FOR ALL TO public USING (true);--> statement-breakpoint
CREATE POLICY "Users can view own profile" ON "users" AS PERMISSIVE FOR SELECT TO public USING (auth.uid()::text = id);--> statement-breakpoint
CREATE POLICY "Users can update own profile" ON "users" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid()::text = id);--> statement-breakpoint
CREATE POLICY "workspace_invites_select_policy" ON "workspace_invites" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "workspace_invites_insert_policy" ON "workspace_invites" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
            workspace_id IN (
                SELECT workspace_id FROM workspace_members 
                WHERE user_id = auth.uid()::text 
                AND status = 'active'
                AND role IN ('owner', 'admin', 'hr_manager')
            )
        );--> statement-breakpoint
CREATE POLICY "workspace_invites_update_policy" ON "workspace_invites" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
            workspace_id IN (
                SELECT workspace_id FROM workspace_members 
                WHERE user_id = auth.uid()::text 
                AND status = 'active'
                AND role IN ('owner', 'admin', 'hr_manager')
            )
        );--> statement-breakpoint
CREATE POLICY "workspace_invites_delete_policy" ON "workspace_invites" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
            workspace_id IN (
                SELECT workspace_id FROM workspace_members 
                WHERE user_id = auth.uid()::text 
                AND status = 'active'
                AND role IN ('owner', 'admin', 'hr_manager')
            )
        );--> statement-breakpoint
CREATE POLICY "Members can view team members" ON "team_members" AS PERMISSIVE FOR SELECT TO public USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Admins can insert members" ON "team_members" AS PERMISSIVE FOR INSERT TO public WITH CHECK (team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()::text
            UNION
            SELECT team_id FROM team_members WHERE user_id = auth.uid()::text AND team_level IN ('team_lead', 'senior')
        ));--> statement-breakpoint
CREATE POLICY "Admins can delete members" ON "team_members" AS PERMISSIVE FOR DELETE TO public USING (team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()::text
            UNION
            SELECT team_id FROM team_members WHERE user_id = auth.uid()::text AND team_level IN ('team_lead', 'senior')
        ));--> statement-breakpoint
CREATE POLICY "Team members can view teams" ON "teams" AS PERMISSIVE FOR SELECT TO public USING (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text) OR owner_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Owners can update teams" ON "teams" AS PERMISSIVE FOR UPDATE TO public USING (owner_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Owners can delete teams" ON "teams" AS PERMISSIVE FOR DELETE TO public USING (owner_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Authenticated users can create teams" ON "teams" AS PERMISSIVE FOR INSERT TO public WITH CHECK (auth.uid() IS NOT NULL);--> statement-breakpoint
CREATE POLICY "Anyone can view template stages" ON "industry_template_stages" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "Anyone can view templates" ON "industry_templates" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "Team members can view project stages" ON "project_stages" AS PERMISSIVE FOR SELECT TO public USING (project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        ));--> statement-breakpoint
CREATE POLICY "Team members can create project stages" ON "project_stages" AS PERMISSIVE FOR INSERT TO public WITH CHECK (project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        ));--> statement-breakpoint
CREATE POLICY "Team members can update project stages" ON "project_stages" AS PERMISSIVE FOR UPDATE TO public USING (project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        ));--> statement-breakpoint
CREATE POLICY "Team members can view projects" ON "projects" AS PERMISSIVE FOR SELECT TO public USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Team members can create projects" ON "projects" AS PERMISSIVE FOR INSERT TO public WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Team members can update projects" ON "projects" AS PERMISSIVE FOR UPDATE TO public USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Team members can view comments" ON "task_comments" AS PERMISSIVE FOR SELECT TO public USING (task_id IN (SELECT id FROM tasks WHERE project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        )));--> statement-breakpoint
CREATE POLICY "Team members can create comments" ON "task_comments" AS PERMISSIVE FOR INSERT TO public WITH CHECK (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Users can delete own comments" ON "task_comments" AS PERMISSIVE FOR DELETE TO public USING (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Team members can view tasks" ON "tasks" AS PERMISSIVE FOR SELECT TO public USING (project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        ));--> statement-breakpoint
CREATE POLICY "Team members can create tasks" ON "tasks" AS PERMISSIVE FOR INSERT TO public WITH CHECK (project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        ));--> statement-breakpoint
CREATE POLICY "Team members can update tasks" ON "tasks" AS PERMISSIVE FOR UPDATE TO public USING (project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        ));--> statement-breakpoint
CREATE POLICY "Assignee or reporter can delete tasks" ON "tasks" AS PERMISSIVE FOR DELETE TO public USING (assignee_id = auth.uid()::text OR reporter_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Workspace members can view files" ON "files" AS PERMISSIVE FOR SELECT TO public USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Workspace members can create files" ON "files" AS PERMISSIVE FOR INSERT TO public WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Workspace members can update files" ON "files" AS PERMISSIVE FOR UPDATE TO public USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Uploader or admin can delete files" ON "files" AS PERMISSIVE FOR DELETE TO public USING (uploaded_by = auth.uid()::text OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND role IN ('owner', 'admin')));--> statement-breakpoint
CREATE POLICY "Members can view their conversations" ON "conversations" AS PERMISSIVE FOR SELECT TO public USING (auth.uid()::text = ANY(SELECT jsonb_array_elements_text(participants)) OR created_by = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Members can add messages to their conversations" ON "conversations" AS PERMISSIVE FOR UPDATE TO public USING (auth.uid()::text = ANY(SELECT jsonb_array_elements_text(participants)) OR created_by = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Workspace members can create conversations" ON "conversations" AS PERMISSIVE FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = conversations.workspace_id AND user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Workspace members can view encryption keys" ON "encryption_keys" AS PERMISSIVE FOR SELECT TO public USING (workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
        ));--> statement-breakpoint
CREATE POLICY "Workspace owners can manage encryption keys" ON "encryption_keys" AS PERMISSIVE FOR ALL TO public USING (workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()::text AND role = 'owner'
        ));--> statement-breakpoint
CREATE POLICY "Team members can view events" ON "calendar_events" AS PERMISSIVE FOR SELECT TO public USING (team_ids && ARRAY(SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Team members can create events" ON "calendar_events" AS PERMISSIVE FOR INSERT TO public WITH CHECK (created_by = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Creator can update events" ON "calendar_events" AS PERMISSIVE FOR UPDATE TO public USING (created_by = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Creator can delete events" ON "calendar_events" AS PERMISSIVE FOR DELETE TO public USING (created_by = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Users can view own filters or shared filters" ON "saved_filters" AS PERMISSIVE FOR SELECT TO public USING (user_id = auth.uid()::text OR is_shared = true);--> statement-breakpoint
CREATE POLICY "Users can create own filters" ON "saved_filters" AS PERMISSIVE FOR INSERT TO public WITH CHECK (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Users can update own filters" ON "saved_filters" AS PERMISSIVE FOR UPDATE TO public USING (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Users can delete own filters" ON "saved_filters" AS PERMISSIVE FOR DELETE TO public USING (user_id = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Workspace members can view templates" ON "task_templates" AS PERMISSIVE FOR SELECT TO public USING (workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
        ));--> statement-breakpoint
CREATE POLICY "Workspace members can create templates" ON "task_templates" AS PERMISSIVE FOR INSERT TO public WITH CHECK (workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
        ));--> statement-breakpoint
CREATE POLICY "Template creators can update templates" ON "task_templates" AS PERMISSIVE FOR UPDATE TO public USING (created_by = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Template creators can delete templates" ON "task_templates" AS PERMISSIVE FOR DELETE TO public USING (created_by = auth.uid()::text);--> statement-breakpoint
CREATE POLICY "Workspace members can view folders" ON "folders" AS PERMISSIVE FOR SELECT TO public USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Workspace members can create folders" ON "folders" AS PERMISSIVE FOR INSERT TO public WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Workspace members can update folders" ON "folders" AS PERMISSIVE FOR UPDATE TO public USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Workspace members can delete folders" ON "folders" AS PERMISSIVE FOR DELETE TO public USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Workspace members can view delivery logs" ON "webhook_deliveries" AS PERMISSIVE FOR SELECT TO public USING (webhook_id IN (SELECT id FROM webhooks WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text)));--> statement-breakpoint
CREATE POLICY "Workspace members can view their webhook jobs" ON "webhook_queue" AS PERMISSIVE FOR SELECT TO public USING (webhook_id IN (SELECT id FROM webhooks WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text)));--> statement-breakpoint
CREATE POLICY "Workspace members can view webhooks" ON "webhooks" AS PERMISSIVE FOR SELECT TO public USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text));--> statement-breakpoint
CREATE POLICY "Workspace admins can manage webhooks" ON "webhooks" AS PERMISSIVE FOR ALL TO public USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND role IN ('owner', 'admin')));