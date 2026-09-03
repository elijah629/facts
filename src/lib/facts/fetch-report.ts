import { assertFactsProgressReportUrl } from "@/lib/report/urls";

const MAX_REPORT_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;

export function resolveFactsRedirect(current: URL, location: string): URL {
  const next = assertFactsProgressReportUrl(
    new URL(location, current).toString(),
  );
  if (next.origin !== current.origin) {
    throw new Error("FACTS_REDIRECT_ORIGIN_INVALID");
  }
  return next;
}

export async function fetchFactsReport(value: string): Promise<string> {
  let reportUrl = assertFactsProgressReportUrl(value);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const response = await fetch(reportUrl, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("FACTS_REDIRECT_LOCATION_MISSING");
      if (redirects === MAX_REDIRECTS) {
        throw new Error("FACTS_REDIRECT_LIMIT_EXCEEDED");
      }
      reportUrl = resolveFactsRedirect(reportUrl, location);
      continue;
    }
    if (!response.ok) throw new Error(`FACTS_FETCH_${response.status}`);
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_REPORT_BYTES) throw new Error("FACTS_REPORT_TOO_LARGE");
    const html = await response.text();
    if (html.length > MAX_REPORT_BYTES) {
      throw new Error("FACTS_REPORT_TOO_LARGE");
    }
    return html;
  }
  throw new Error("FACTS_REDIRECT_LIMIT_EXCEEDED");
}
