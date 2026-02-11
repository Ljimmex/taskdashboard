ALTER TABLE "calendar_event_teams" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "calendar_event_teams" CASCADE;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "team_ids" uuid[];--> statement-breakpoint
UPDATE "calendar_events" SET "team_ids" = ARRAY[team_id] WHERE team_id IS NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_events" ALTER COLUMN "team_ids" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_events" DROP CONSTRAINT "calendar_events_team_id_teams_id_fk";--> statement-breakpoint
ALTER TABLE "calendar_events" DROP COLUMN "team_id";--> statement-breakpoint
ALTER POLICY "Team members can view events" ON "calendar_events" TO public USING (team_ids && ARRAY(SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));