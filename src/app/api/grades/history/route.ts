import { type NextRequest, NextResponse } from "next/server";
import { currentSession } from "@/lib/auth/session";
import { gradeHistory, historicalGradebook } from "@/lib/gradebook/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await currentSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const revisionId = request.nextUrl.searchParams.get("revision") ?? undefined;
  const rawTimestamp = request.nextUrl.searchParams.get("timestamp");
  if (!revisionId && !rawTimestamp) {
    return NextResponse.json({ history: await gradeHistory(session.user.id) });
  }
  const timestamp = rawTimestamp ? new Date(rawTimestamp) : undefined;
  if (timestamp && Number.isNaN(timestamp.getTime())) {
    return NextResponse.json({ error: "invalid_timestamp" }, { status: 400 });
  }
  try {
    return NextResponse.json(
      await historicalGradebook(session.user.id, { revisionId, timestamp }),
    );
  } catch {
    return NextResponse.json({ error: "history_not_found" }, { status: 404 });
  }
}
