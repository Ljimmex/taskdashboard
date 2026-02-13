CREATE TABLE "two_factor_trust" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"two_factor_id" text,
	"device_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "two_factor_trust" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "Users can view own trusted devices" ON "two_factor_trust" AS PERMISSIVE FOR SELECT TO public USING (user_id = auth.uid()::text);