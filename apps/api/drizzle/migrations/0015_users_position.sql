-- Add position column to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "position" varchar(100);

-- Ensure first_name and last_name exist (just in case)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_name" varchar(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name" varchar(100);
