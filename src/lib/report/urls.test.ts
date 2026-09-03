import { describe, expect, test } from "bun:test";
import { assertFactsProgressReportUrl } from "./urls";

const report =
  "https://school.client.factsmgt.com/renweb/email/getreport.cfm?district=school&sessionid=temporary&redirect=1";

describe("email progress report URLs", () => {
  test("accepts a FACTS email progress report", () => {
    expect(assertFactsProgressReportUrl(report).toString()).toBe(report);
  });

  test("rejects the retired per-class progress report", () => {
    expect(() =>
      assertFactsProgressReportUrl(
        "https://school.client.factsmgt.com/pwr/NAScopy/Gradebook/GradeBookProgressReport-PW.cfm?StudentID=42&ClassID=1&Sessionid=temporary",
      ),
    ).toThrow("Only FACTS GradeBook progress-report links are supported.");
  });

  test("requires district and session", () => {
    expect(() =>
      assertFactsProgressReportUrl(
        "https://school.client.factsmgt.com/renweb/email/getreport.cfm?district=school",
      ),
    ).toThrow("FACTS report link is missing sessionid.");
  });

  test("rejects deceptive hosts and URL credentials", () => {
    expect(() =>
      assertFactsProgressReportUrl(
        "https://school.client.factsmgt.com.evil.test/renweb/email/getreport.cfm?district=x&sessionid=y",
      ),
    ).toThrow("Only FACTS GradeBook progress-report links are supported.");
    expect(() =>
      assertFactsProgressReportUrl(
        "https://user@school.client.factsmgt.com/renweb/email/getreport.cfm?district=x&sessionid=y",
      ),
    ).toThrow("unsupported URL components");
  });
});
