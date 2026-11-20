import { sql } from "drizzle-orm";
import { gradebookHeads, gradebookStreams } from "@/lib/db/schema";
import {
  SCHOOL_RANK_MAX_AGE_MS,
  SCHOOL_RANK_MINIMUM,
} from "./school-rank-projection";

export type SchoolRank = {
  rank: number;
  total: number;
  percentile: number;
};

export function schoolRankQuery(userId: string, now: Date) {
  const freshSince = new Date(
    now.getTime() - SCHOOL_RANK_MAX_AGE_MS,
  ).toISOString();
  // Select the school and term from the signed-in user's own saved report.
  // Collapse copies of the same student's report. Exclude conflicting copies.
  return sql`
    with viewer as (
      select h.rank_cohort, h.rank_student_key, h.rank_gpa
      from ${gradebookStreams} s
      join ${gradebookHeads} h on h.stream_id = s.id
      where s.user_id = ${userId} and h.last_successful_fetch_at >= ${freshSince}::timestamptz
        and h.rank_cohort is not null and h.rank_student_key is not null and h.rank_gpa is not null
    ),
    students as (
      select h.rank_student_key, min(h.rank_gpa) as gpa
      from viewer v
      join ${gradebookHeads} h on h.rank_cohort = v.rank_cohort
      where h.last_successful_fetch_at >= ${freshSince}::timestamptz
        and h.rank_student_key is not null and h.rank_gpa is not null
      group by h.rank_student_key
      having min(h.rank_gpa) = max(h.rank_gpa)
    )
    select
      (1 + count(*) filter (where other.gpa > me.gpa))::int as rank,
      count(*)::int as total,
      round(100.0 * (
        count(*) filter (where other.gpa < me.gpa) +
        0.5 * (count(*) filter (where other.gpa = me.gpa) - 1)
      ) / nullif(count(*) - 1, 0))::int as percentile
    from viewer v
    join students me on me.rank_student_key = v.rank_student_key and me.gpa = v.rank_gpa
    cross join students other
    having count(*) >= ${SCHOOL_RANK_MINIMUM}
  `;
}
