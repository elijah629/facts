ALTER TABLE "gradebook_revisions" ADD COLUMN "packed_delta" "bytea";--> statement-breakpoint
ALTER TABLE "gradebook_revisions" ADD COLUMN "window_started_at" timestamp with time zone;