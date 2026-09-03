import { currentSession } from "@/lib/auth/session";
import { gradeHistory, historicalGradebook } from "@/lib/gradebook/service";

export async function GET(request: Request) {
  const session = await currentSession();
  if (!session)
    return Response.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const revisionId = searchParams.get("revision") ?? undefined;
  const rawTimestamp = searchParams.get("timestamp");
  if (!revisionId && !rawTimestamp) {
    return Response.json({ history: await gradeHistory(session.user.id) });
  }
  const timestamp = rawTimestamp ? new Date(rawTimestamp) : undefined;
  if (timestamp && Number.isNaN(timestamp.getTime())) {
    return Response.json({ error: "invalid_timestamp" }, { status: 400 });
  }
  try {
    return Response.json(
      await historicalGradebook(session.user.id, { revisionId, timestamp }),
    );
  } catch {
    return Response.json({ error: "history_not_found" }, { status: 404 });
  }
}
