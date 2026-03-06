ALTER TABLE "documents" DROP CONSTRAINT "documents_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "documents" DROP CONSTRAINT "documents_folder_id_folders_id_fk";
--> statement-breakpoint
ALTER TABLE "whiteboards" DROP CONSTRAINT "whiteboards_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "whiteboards" DROP CONSTRAINT "whiteboards_folder_id_folders_id_fk";
--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "folder_id";--> statement-breakpoint
ALTER TABLE "whiteboards" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "whiteboards" DROP COLUMN "folder_id";