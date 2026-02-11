CREATE TABLE "calendar_event_teams" (
	"event_id" uuid NOT NULL,
	"team_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "meeting_link" varchar(512);--> statement-breakpoint
ALTER TABLE "calendar_event_teams" ADD CONSTRAINT "calendar_event_teams_event_id_calendar_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_teams" ADD CONSTRAINT "calendar_event_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER POLICY "Team members can view events" ON "calendar_events" TO public USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text) OR id IN (SELECT event_id FROM calendar_event_teams WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)));--> statement-breakpoint
ALTER POLICY "Team members can create events" ON "calendar_events" TO public WITH CHECK (created_by = auth.uid()::text);