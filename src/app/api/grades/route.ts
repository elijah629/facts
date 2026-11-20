import { type NextRequest, NextResponse } from "next/server";
import { currentSession } from "@/lib/auth/session";
import { gradebookChanges } from "@/lib/gradebook/changes";
import { currentGradebook } from "@/lib/gradebook/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const headers = { "cache-control": "private, no-store" };
  const session = await currentSession();
  if (!session)
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers },
    );
  const dashboard = request.nextUrl.searchParams.get("view") === "dashboard";
  const result = await currentGradebook(session.user.id, !dashboard);
  return NextResponse.json(
    {
      report: result.report,
      ...(dashboard
        ? {
            changes:
              result.state && result.report
                ? gradebookChanges(
                    result.state,
                    result.sync.delta,
                    result.report,
                  )
                : [],
            changesObservedAt: result.sync.observedAt,
          }
        : { calculated: result.calculated }),
      freshness: {
        stale: result.sync.stale,
        lastSuccessfulFactsFetch: result.sync.lastSuccessfulFactsFetch,
        latestRevision: result.sync.revisionId,
        errorCode: result.sync.errorCode,
      },
    },
    { headers },
  );
}
