import { currentSession } from "@/lib/auth/session";
import { revisionHistoryPage } from "@/lib/gradebook/history-view";
import { timelineQuery } from "@/lib/gradebook/timeline-query";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const session = await currentSession();
    if (!session)
      return Response.json({ error: "unauthorized" }, { status: 401, headers });
    const params = new URL(request.url).searchParams;
    const query = timelineQuery.safeParse({
      before: params.get("before") ?? undefined,
      revision: params.get("revision") ?? undefined,
    });
    if (!query.success)
      return Response.json(
        { error: "invalid_history_link" },
        { status: 400, headers },
      );
    const page = await revisionHistoryPage(session.user.id, query.data);
    return Response.json(page, {
      status: page.unavailable ? 404 : 200,
      headers,
    });
  } catch {
    return Response.json(
      { error: "history_unavailable" },
      { status: 503, headers },
    );
  }
}
