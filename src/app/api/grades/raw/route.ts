import { currentSession } from "@/lib/auth/session";
import { isConnectionError } from "@/lib/db/read";
import { rawGradebookReport } from "@/lib/gradebook/raw-report";

const RAW_REPORT_HEADERS = {
  "cache-control": "private, no-store, max-age=0",
  "content-security-policy":
    "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-ancestors 'self'",
  "content-type": "text/html; charset=utf-8",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};

export async function GET() {
  try {
    const session = await currentSession();
    if (!session)
      return new Response("Sign in to view the FACTS report.", {
        status: 401,
        headers: RAW_REPORT_HEADERS,
      });
    return new Response(await rawGradebookReport(session.user.id), {
      headers: RAW_REPORT_HEADERS,
    });
  } catch (error) {
    const disconnected = isConnectionError(error);
    return new Response(
      disconnected
        ? "The report service is temporarily unavailable. Reload the page to try again."
        : "The raw FACTS report could not be opened. Refresh your gradebook and try again.",
      {
        status: disconnected ? 503 : 404,
        headers: RAW_REPORT_HEADERS,
      },
    );
  }
}
