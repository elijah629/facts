import { expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core";
import { schoolRankQuery } from "./school-rank";

test("rank returns only the viewer's same-cohort rank and percentile", async () => {
  const db = new PGlite();
  const now = new Date("2026-11-20T00:00:00Z");
  const dialect = new PgDialect();
  async function rank(userId: string) {
    const { sql, params } = dialect.sqlToQuery(schoolRankQuery(userId, now));
    return (await db.query(sql, params)).rows;
  }
  try {
    await db.exec(`
      create table gradebook_streams (id text primary key, user_id text unique not null);
      create table gradebook_heads (
        stream_id text primary key,
        rank_cohort text,
        rank_student_key text,
        rank_gpa integer,
        last_successful_fetch_at timestamptz
      );
      insert into gradebook_streams select 'user-' || i, 'user-' || i from generate_series(1, 10) i;
      insert into gradebook_heads
        select 'user-' || i, 'same-school-term', 'student-' || i, least(i, 9) * 400, '2026-11-19'
        from generate_series(1, 10) i;
      insert into gradebook_streams values ('other', 'other'), ('old', 'old'), ('copy', 'copy'), ('other-term', 'other-term');
      insert into gradebook_heads values
        ('other', 'other-school-term', 'other', 4300, '2026-11-19'),
        ('old', 'same-school-term', 'old', 4300, '2026-09-01'),
        ('copy', 'same-school-term', 'student-1', 400, '2026-11-19'),
        ('other-term', 'other-term', 'other-term', 4300, '2026-11-19');
    `);
    expect(await rank("user-8")).toEqual([
      { rank: 3, total: 10, percentile: 78 },
    ]);
    expect(await rank("user-9")).toEqual([
      { rank: 1, total: 10, percentile: 94 },
    ]);
    expect(await rank("user-10")).toEqual(await rank("user-9"));
    expect(await rank("other")).toEqual([]);
    expect(await rank("old")).toEqual([]);
    expect(await rank("other-term")).toEqual([]);
    expect(await rank("unknown")).toEqual([]);
    await db.exec(
      "update gradebook_heads set rank_gpa = 4300 where stream_id = 'copy'",
    );
    expect(await rank("user-8")).toEqual([]);
    expect(await rank("user-1")).toEqual([]);
  } finally {
    await db.close();
  }
});

test("only the verified FACTS school hostname can define the cohort", async () => {
  const { state } = await import("./history-fixture");
  const { reportProjection } = await import("./projection");
  const { schoolRankProjection } = await import("./school-rank-projection");
  const valid =
    "https://gmhs-ca.client.factsmgt.com/renweb/email/getreport.cfm?District=GMHS-CA&SessionID=synthetic";
  const previousKey = process.env.FACTS_SOURCE_ENCRYPTION_KEY;
  process.env.FACTS_SOURCE_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString(
    "base64",
  );
  try {
    const report = reportProjection(state());
    const first = schoolRankProjection(report, valid);
    expect(first.rankCohort).toBe('["gmhs-ca",2026,2027,"1"]');
    expect(first.rankGpa).toBe(3300);
    expect(first.rankStudentKey).toBe(
      schoolRankProjection({ ...report, for: " STUDENT " }, valid)
        .rankStudentKey,
    );
    expect(
      schoolRankProjection({ ...report, term: "2" }, valid).rankStudentKey,
    ).not.toBe(first.rankStudentKey);
    expect(
      schoolRankProjection(
        report,
        valid.replace("District=GMHS-CA", "District=another-school"),
      ).rankCohort,
    ).toBeNull();
    expect(
      schoolRankProjection(report, `${valid}&district=gmhs-ca`).rankCohort,
    ).toBeNull();
  } finally {
    if (previousKey === undefined)
      delete process.env.FACTS_SOURCE_ENCRYPTION_KEY;
    else process.env.FACTS_SOURCE_ENCRYPTION_KEY = previousKey;
  }
});
