ALTER TABLE "tasks" ALTER COLUMN "assignees" TYPE text[] USING CASE WHEN "assignees" IS NOT NULL THEN ARRAY["assignees"] ELSE '{}' END;
ALTER TABLE "tasks" ALTER COLUMN "assignees" SET DEFAULT '{}';