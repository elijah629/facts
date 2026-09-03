import { assertFactsProgressReportUrl } from "@/lib/report/urls";

const MAX_REPORT_BYTES = 2_000_000;

export async function fetchFactsReport(value: string): Promise<string> {
  const reportUrl = assertFactsProgressReportUrl(value);
  const response = await fetch(reportUrl, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`FACTS_FETCH_${response.status}`);
  }
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_REPORT_BYTES) throw new Error("FACTS_REPORT_TOO_LARGE");
  const html = await response.text();
  if (html.length > MAX_REPORT_BYTES) throw new Error("FACTS_REPORT_TOO_LARGE");
  return html;
}
