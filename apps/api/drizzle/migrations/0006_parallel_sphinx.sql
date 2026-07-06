CREATE TYPE "public"."invoice_status" AS ENUM('pending', 'paid', 'failed', 'refunded', 'void');--> statement-breakpoint
CREATE TYPE "public"."subscription_event_type" AS ENUM('seat_added', 'seat_removed', 'plan_changed', 'subscription_activated', 'subscription_cancelled', 'subscription_past_due', 'payment_succeeded', 'payment_failed');--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"subscription_id" text,
	"polar_invoice_id" text,
	"polar_order_id" text,
	"status" "invoice_status" DEFAULT 'pending' NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"paid_at" timestamp,
	"failed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_polar_invoice_id_unique" UNIQUE("polar_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "subscription_events" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"type" "subscription_event_type" NOT NULL,
	"seats_delta" integer DEFAULT 0 NOT NULL,
	"seats_after" integer NOT NULL,
	"amount_cents" integer,
	"currency" varchar(3),
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"polar_subscription_id" text NOT NULL,
	"polar_customer_id" text NOT NULL,
	"polar_product_id" text,
	"polar_price_id" text,
	"plan" varchar(50) NOT NULL,
	"status" varchar(50) NOT NULL,
	"billing_day" integer NOT NULL,
	"current_seats" integer DEFAULT 1 NOT NULL,
	"seat_price_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_polar_subscription_id_unique" UNIQUE("polar_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "notification_inboxes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "max_members" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "max_projects" SET DEFAULT 5;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "max_projects" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "max_storage_gb" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "max_storage_gb" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ALTER COLUMN "features" SET DEFAULT '{"customBranding":false,"advancedReporting":false,"apiAccess":"none","ssoEnabled":false,"prioritySupport":false,"hrApproval":false,"revShare":false}'::jsonb;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "billing_day" integer;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "polar_customer_id" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "polar_subscription_id" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "current_seat_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "used_storage_bytes" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "max_teams" integer DEFAULT 2;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "max_docs" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "max_whiteboards" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "max_file_size_mb" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN IF NOT EXISTS "is_paused" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN IF NOT EXISTS "paused_at" timestamp;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN IF NOT EXISTS "total_paused_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."workspaces" ALTER COLUMN "subscription_plan" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "public"."workspaces" ALTER COLUMN "subscription_plan" SET DATA TYPE text;--> statement-breakpoint
UPDATE "public"."workspaces" SET "subscription_plan" = CASE
  WHEN "subscription_plan" = 'starter' THEN 'plus'
  WHEN "subscription_plan" = 'professional' THEN 'pro'
  ELSE "subscription_plan"
END;--> statement-breakpoint
DROP TYPE "public"."subscription_plan";--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'plus', 'pro', 'enterprise');--> statement-breakpoint
ALTER TABLE "public"."workspaces" ALTER COLUMN "subscription_plan" SET DATA TYPE "public"."subscription_plan" USING "subscription_plan"::"public"."subscription_plan";--> statement-breakpoint
ALTER TABLE "public"."workspaces" ALTER COLUMN "subscription_plan" SET DEFAULT 'free';--> statement-breakpoint
DROP POLICY IF EXISTS "notification_inboxes_select_policy" ON "notification_inboxes";--> statement-breakpoint
CREATE POLICY "notification_inboxes_select_policy" ON "notification_inboxes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid()::text = "notification_inboxes"."user_id");--> statement-breakpoint
DROP POLICY IF EXISTS "notification_inboxes_insert_policy" ON "notification_inboxes";--> statement-breakpoint
CREATE POLICY "notification_inboxes_insert_policy" ON "notification_inboxes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid()::text = "notification_inboxes"."user_id");--> statement-breakpoint
DROP POLICY IF EXISTS "notification_inboxes_update_policy" ON "notification_inboxes";--> statement-breakpoint
CREATE POLICY "notification_inboxes_update_policy" ON "notification_inboxes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid()::text = "notification_inboxes"."user_id");--> statement-breakpoint
DROP POLICY IF EXISTS "notification_inboxes_delete_policy" ON "notification_inboxes";--> statement-breakpoint
CREATE POLICY "notification_inboxes_delete_policy" ON "notification_inboxes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid()::text = "notification_inboxes"."user_id");