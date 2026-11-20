import { sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import {
  gradebookStreams,
  oauthClientAssertion,
  session,
  verification,
} from "@/lib/db/schema";
import { syncGradebook } from "@/lib/gradebook/sync";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const streams = await db
    .select({ userId: gradebookStreams.userId })
    .from(gradebookStreams);
  let changed = 0;
  let stale = 0;
  let cursor = 0;
  const cleanup = db.execute<{
    sessions: number;
    assertions: number;
    verifications: number;
  }>(sql`
    with expired_sessions as (
      delete from ${session} where expires_at <= timezone('UTC', now()) returning 1
    ), expired_assertions as (
      delete from ${oauthClientAssertion} where expires_at <= timezone('UTC', now()) returning 1
    ), expired_verifications as (
      delete from ${verification} where expires_at <= timezone('UTC', now()) returning 1
    )
    select
      (select count(*)::int from expired_sessions) as sessions,
      (select count(*)::int from expired_assertions) as assertions,
      (select count(*)::int from expired_verifications) as verifications
  `);
  const workers = Array.from(
    { length: Math.min(4, streams.length) },
    async () => {
      while (cursor < streams.length) {
        const stream = streams[cursor++];
        const result = await syncGradebook(stream.userId, {
          discoverNewSource: true,
        });
        if (result.changed) changed++;
        if (result.stale) stale++;
      }
    },
  );
  const [cleaned] = await Promise.all([cleanup, ...workers]);
  return NextResponse.json({
    checked: streams.length,
    changed,
    stale,
    cleaned: cleaned.rows[0],
  });
}
