ALTER TABLE "gradebook_revisions" ALTER COLUMN "data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "gradebook_streams" ADD COLUMN "storage_format" text DEFAULT 'forward-v1' NOT NULL;