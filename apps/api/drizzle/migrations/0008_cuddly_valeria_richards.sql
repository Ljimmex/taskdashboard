CREATE TYPE "public"."webhook_type" AS ENUM('generic', 'discord', 'slack');--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "type" "webhook_type" DEFAULT 'generic' NOT NULL;