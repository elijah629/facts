const REPORT_PATH = "/renweb/email/getreport.cfm";

export function assertFactsProgressReportUrl(value: string): URL {
  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error("FACTS report links must use HTTPS.");
  }

  if (
    !url.hostname.toLowerCase().endsWith(".client.factsmgt.com") ||
    url.pathname.toLowerCase() !== REPORT_PATH.toLowerCase()
  ) {
    throw new Error(
      "Only FACTS GradeBook progress-report links are supported.",
    );
  }

  for (const parameter of ["district", "sessionid"]) {
    if (!url.searchParams.get(parameter)) {
      throw new Error(`FACTS report link is missing ${parameter}.`);
    }
  }

  return url;
}
