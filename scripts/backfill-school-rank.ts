import { loadEnvConfig } from "@next/env";
import { Client, type QueryResult } from "pg";
import { neonDatabaseUrl } from "../src/lib/env";
import { reportProjection } from "../src/lib/gradebook/projection";
import {
  SCHOOL_RANK_MAX_AGE_MS,
  schoolRankProjection,
} from "../src/lib/gradebook/school-rank-projection";
import type { GradebookState } from "../src/lib/gradebook/types";
import { decryptSource } from "../src/lib/security/source-encryption";

loadEnvConfig(process.cwd());

interface Head {
  stream_id: string;
  head_state_hash: string;
  encrypted_active_facts_url: string;
  current_state: GradebookState;
  last_successful_fetch_at: Date;
}

async function backfill() {
  const client = new Client({
    connectionString: neonDatabaseUrl("DATABASE_URL_UNPOOLED"),
    connectionTimeoutMillis: 10_000,
  });
  await client.connect();
  try {
    const cutoff = new Date(Date.now() - SCHOOL_RANK_MAX_AGE_MS);
    let cursor: string | null = null;
    let updated = 0;
    let skipped = 0;
    for (;;) {
      const page: QueryResult<Head> = await client.query<Head>(
        `select stream_id, head_state_hash, encrypted_active_facts_url, current_state, last_successful_fetch_at
         from gradebook_heads
         where ($1::uuid is null or stream_id > $1) and last_successful_fetch_at >= $2
           and rank_cohort is null and current_state is not null and head_state_hash is not null
           and encrypted_active_facts_url is not null
         order by stream_id limit 25`,
        [cursor, cutoff],
      );
      if (!page.rows.length) break;
      for (const head of page.rows) {
        cursor = head.stream_id;
        let fields: ReturnType<typeof schoolRankProjection>;
        try {
          fields = schoolRankProjection(
            reportProjection(head.current_state),
            decryptSource(head.encrypted_active_facts_url),
          );
        } catch {
          skipped++;
          continue;
        }
        if (!fields.rankCohort) {
          skipped++;
          continue;
        }
        const result = await client.query(
          `update gradebook_heads set rank_cohort = $1, rank_student_key = $2, rank_gpa = $3
           where stream_id = $4 and head_state_hash = $5 and last_successful_fetch_at = $6
             and encrypted_active_facts_url = $7 and rank_cohort is null`,
          [
            fields.rankCohort,
            fields.rankStudentKey,
            fields.rankGpa,
            head.stream_id,
            head.head_state_hash,
            head.last_successful_fetch_at,
            head.encrypted_active_facts_url,
          ],
        );
        updated += result.rowCount ?? 0;
      }
    }
    console.log(
      `School standing backfill complete. Updated: ${updated}. Skipped: ${skipped}.`,
    );
  } finally {
    await client.end();
  }
}

backfill().catch(() => {
  console.error(
    "School standing backfill failed. Check database access and migration status.",
  );
  process.exitCode = 1;
});
