import { describe, expect, test } from "bun:test";
import { parseReportUrls, refreshReportUrls } from "./urls";

const report = (classId: string, session = "old") =>
  `https://school.client.factsmgt.com/pwr/NAScopy/Gradebook/GradeBookProgressReport-PW.cfm?StudentID=42&ClassID=${classId}&Sessionid=${session}&ReportHash=keep-me`;

describe("per-class report URLs", () => {
  test("extracts and deduplicates pasted links", () => {
    expect(
      parseReportUrls(`${report("1")}\n${report("2")}, ${report("1")}`),
    ).toEqual([report("1"), report("2")]);
  });

  test("reuses a fresh session without changing class hashes", () => {
    const refreshed = refreshReportUrls(
      [report("1"), report("2")],
      report("2", "new-session"),
    );

    expect(refreshed).toHaveLength(2);
    expect(
      refreshed.every((url) => url.includes("Sessionid=new-session")),
    ).toBe(true);
    expect(refreshed[0]).toContain("ClassID=1");
    expect(refreshed[0]).toContain("ReportHash=keep-me");
  });
});
