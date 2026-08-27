const REPORT_PATH = "/pwr/NAScopy/Gradebook/GradeBookProgressReport-PW.cfm";

export function parseReportUrls(value: string): string[] {
  const matches = value.match(/https?:\/\/[^\s,]+/gi) ?? [];

  return [...new Set(matches.map((match) => match.replace(/[)>\]}]+$/, "")))];
}

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

  for (const parameter of ["StudentID", "ClassID", "Sessionid"]) {
    if (!url.searchParams.get(parameter)) {
      throw new Error(`FACTS report link is missing ${parameter}.`);
    }
  }

  return url;
}

/** Apply the newest session to every saved per-class report URL. */
export function refreshReportUrls(
  savedUrls: string[],
  freshUrl: string,
): string[] {
  const fresh = assertFactsProgressReportUrl(freshUrl);
  const sessionId = fresh.searchParams.get("Sessionid");
  const studentId = fresh.searchParams.get("StudentID");
  const hostname = fresh.hostname.toLowerCase();

  return savedUrls.map((value) => {
    const saved = assertFactsProgressReportUrl(value);

    if (
      saved.hostname.toLowerCase() !== hostname ||
      saved.searchParams.get("StudentID") !== studentId
    ) {
      throw new Error(
        "The new link must belong to the same student and school.",
      );
    }

    saved.searchParams.set("Sessionid", sessionId ?? "");
    return saved.toString();
  });
}
