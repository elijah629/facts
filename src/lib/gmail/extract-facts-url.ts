import { assertFactsProgressReportUrl } from "@/lib/report/urls";

const URL_PATTERN = /https:\/\/[^\s"'<>]+getreport\.cfm\?[^\s"'<>]+/gi;

export function extractFactsUrls(body: string): string[] {
  const decoded = body
    .replace(/&amp;/gi, "&")
    .replace(/=3D/gi, "=")
    .replace(/=\r?\n/g, "");
  const urls: string[] = [];
  for (const candidate of decoded.match(URL_PATTERN) ?? []) {
    try {
      const url = assertFactsProgressReportUrl(candidate).toString();
      if (!urls.includes(url)) urls.push(url);
    } catch {
      // Ignore unrelated or malformed links.
    }
  }
  return urls;
}
