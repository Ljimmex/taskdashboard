CREATE TYPE "public"."calendar_event_type" AS ENUM('event', 'task', 'meeting', 'reminder');--> statement-breakpoint
ALTER TABLE "calendar_events" ALTER COLUMN "type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "calendar_events" ALTER COLUMN "type" SET DATA TYPE calendar_event_type USING type::calendar_event_type;--> statement-breakpoint
ALTER TABLE "calendar_events" ALTER COLUMN "type" SET DEFAULT 'event';