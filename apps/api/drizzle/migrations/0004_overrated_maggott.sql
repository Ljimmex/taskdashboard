CREATE TABLE "industry_template_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_en" varchar(100),
	"color" varchar(7) DEFAULT '#6B7280' NOT NULL,
	"position" integer NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "industry_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_en" varchar(100),
	"description" text,
	"icon" varchar(10),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "industry_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "project_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7) DEFAULT '#6B7280' NOT NULL,
	"position" integer NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "industry_template_id" uuid;--> statement-breakpoint
ALTER TABLE "task_comments" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "task_comments" ADD COLUMN "likes" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "industry_template_stages" ADD CONSTRAINT "industry_template_stages_template_id_industry_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."industry_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_industry_template_id_industry_templates_id_fk" FOREIGN KEY ("industry_template_id") REFERENCES "public"."industry_templates"("id") ON DELETE set null ON UPDATE no action;