import { describe, expect, test } from "bun:test";
import { resolveFactsRedirect } from "./fetch-report";

const report = new URL(
  "https://school.client.factsmgt.com/renweb/email/GetReport.cfm?District=school&SessionID=secret",
);

describe("FACTS report redirects", () => {
  test("allows same-origin canonical redirects", () => {
    const next = resolveFactsRedirect(
      report,
      "/renweb/email/getreport.cfm?District=school&SessionID=secret",
    );
    expect(next.pathname).toBe("/renweb/email/getreport.cfm");
  });

  test("rejects redirects to another origin", () => {
    expect(() =>
      resolveFactsRedirect(
        report,
        "https://other.client.factsmgt.com/renweb/email/getreport.cfm?District=school&SessionID=secret",
      ),
    ).toThrow("FACTS_REDIRECT_ORIGIN_INVALID");
  });
});
