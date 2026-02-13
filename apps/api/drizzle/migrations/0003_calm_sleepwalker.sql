CREATE TABLE "two_factor_trust" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"metadata" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "two_factor_trust" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "encryption_keys" ADD COLUMN "history" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER POLICY "Users can view own two factor" ON "two_factors" RENAME TO "Backend can manage two factor";--> statement-breakpoint
DROP POLICY "Users can update own two factor" ON "two_factors" CASCADE;--> statement-breakpoint
DROP POLICY "Users can insert own two factor" ON "two_factors" CASCADE;--> statement-breakpoint
CREATE POLICY "Backend can manage trusted devices" ON "two_factor_trust" AS PERMISSIVE FOR ALL TO public USING (true);