import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { gradebookStreams } from "@/lib/db/schema";
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
  await Promise.all(workers);
  return NextResponse.json({ checked: streams.length, changed, stale });
}
