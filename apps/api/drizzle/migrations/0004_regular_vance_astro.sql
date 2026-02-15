ALTER TABLE "calendar_events" ALTER COLUMN "team_ids" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "calendar_events" ALTER COLUMN "team_ids" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "attendee_ids" text[] DEFAULT '{}';--> statement-breakpoint
ALTER POLICY "Team members can view events" ON "calendar_events" TO public USING (team_ids && ARRAY(SELECT team_id FROM team_members WHERE user_id = auth.uid()::text) OR auth.uid()::text = ANY(attendee_ids) OR created_by = auth.uid()::text);