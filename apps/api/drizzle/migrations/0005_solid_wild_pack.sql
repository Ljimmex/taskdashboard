CREATE TABLE "notification_inboxes" (
	"user_id" text PRIMARY KEY NOT NULL,
	"unread" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_inboxes" ADD CONSTRAINT "notification_inboxes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;