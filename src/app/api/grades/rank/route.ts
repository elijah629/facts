import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { databaseRead } from "@/lib/db/read";
import { type SchoolRank, schoolRankQuery } from "@/lib/gradebook/school-rank";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "cache-control": "private, no-store" };
  const session = await currentSession();
  if (!session)
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers },
    );
  try {
    const result = await databaseRead(() =>
      db.execute<SchoolRank>(schoolRankQuery(session.user.id, new Date())),
    );
    return NextResponse.json({ standing: result.rows[0] ?? null }, { headers });
  } catch {
    console.warn("School standing query failed");
    return NextResponse.json(
      { error: "unavailable" },
      { status: 503, headers },
    );
  }
}
