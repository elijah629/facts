ALTER TABLE "gradebook_heads" ADD COLUMN "rank_cohort" text;--> statement-breakpoint
ALTER TABLE "gradebook_heads" ADD COLUMN "rank_student_key" text;--> statement-breakpoint
ALTER TABLE "gradebook_heads" ADD COLUMN "rank_gpa" integer;--> statement-breakpoint
CREATE INDEX "gradebook_heads_rank_cohort_idx" ON "gradebook_heads" USING btree ("rank_cohort","last_successful_fetch_at");