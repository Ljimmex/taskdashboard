ALTER TABLE "users" ADD COLUMN "public_key" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "encrypted_private_key" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "key_salt" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "key_iv" text;