import { currentSession } from "@/lib/auth/session";
import { rawGradebookReport } from "@/lib/gradebook/raw-report";

export const dynamic = "force-dynamic";

const RAW_REPORT_HEADERS = {
  "cache-control": "private, no-store, max-age=0",
  "content-security-policy":
    "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-ancestors 'self'",
  "content-type": "text/html; charset=utf-8",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};

export async function GET() {
  const session = await currentSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  try {
    return new Response(await rawGradebookReport(session.user.id), {
      headers: RAW_REPORT_HEADERS,
    });
  } catch {
    return new Response("Raw report unavailable. Refresh grades first.", {
      status: 404,
      headers: { "cache-control": "private, no-store, max-age=0" },
    });
  }
}
