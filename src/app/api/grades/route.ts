import { currentSession } from "@/lib/auth/session";
import { currentGradebook } from "@/lib/gradebook/service";

export async function GET() {
  const session = await currentSession();
  if (!session)
    return Response.json({ error: "unauthorized" }, { status: 401 });
  const result = await currentGradebook(session.user.id);
  return Response.json({
    report: result.report,
    calculated: result.calculated,
    freshness: {
      stale: result.sync.stale,
      lastSuccessfulFactsFetch: result.sync.lastSuccessfulFactsFetch,
      latestRevision: result.sync.revisionId,
      errorCode: result.sync.errorCode,
    },
  });
}
