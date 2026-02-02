DO $$ BEGIN
    CREATE TYPE "conversation_type" AS ENUM ('direct', 'group', 'channel');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
	"workspace_id" text,
	"name" varchar(100),
	"description" text,
	"type" "conversation_type" DEFAULT 'direct' NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb,
	"participants" jsonb DEFAULT '[]'::jsonb,
	"created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp
);
