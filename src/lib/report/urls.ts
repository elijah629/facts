const REPORT_PATH = "/renweb/email/getreport.cfm";

export function assertFactsProgressReportUrl(value: string): URL {
  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error("FACTS report links must use HTTPS.");
  }

  if (url.username || url.password || url.port || url.hash) {
    throw new Error("FACTS report link contains unsupported URL components.");
  }

  if (
    !url.hostname.toLowerCase().endsWith(".client.factsmgt.com") ||
    url.pathname.toLowerCase() !== REPORT_PATH.toLowerCase()
  ) {
    throw new Error(
      "Only FACTS GradeBook progress-report links are supported.",
    );
  }

  const parameters = new Map(
    Array.from(url.searchParams, ([key, value]) => [key.toLowerCase(), value]),
  );
  for (const parameter of ["district", "sessionid"]) {
    const value = parameters.get(parameter);
    if (!value) {
      throw new Error(`FACTS report link is missing ${parameter}.`);
    }
  }

  return url;
}
