ALTER TABLE "gradebook_heads" DROP CONSTRAINT "gradebook_heads_head_revision_id_gradebook_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "gradebook_revisions" DROP CONSTRAINT "gradebook_revisions_parent_revision_id_gradebook_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "gradebook_heads" ADD CONSTRAINT "gradebook_heads_head_revision_id_gradebook_revisions_id_fk" FOREIGN KEY ("head_revision_id") REFERENCES "public"."gradebook_revisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook_revisions" ADD CONSTRAINT "gradebook_revisions_parent_revision_id_gradebook_revisions_id_fk" FOREIGN KEY ("parent_revision_id") REFERENCES "public"."gradebook_revisions"("id") ON DELETE cascade ON UPDATE no action;