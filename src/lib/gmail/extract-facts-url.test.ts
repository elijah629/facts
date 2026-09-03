import { describe, expect, test } from "bun:test";
import { extractFactsUrls } from "./extract-facts-url";

describe("FACTS email link extraction", () => {
  test("extracts HTML-escaped progress report links", () => {
    const body =
      '<a href="https://demo.client.factsmgt.com/renweb/email/GetReport.cfm?District=GARCES&amp;SessionID=secret">Report</a>';
    expect(extractFactsUrls(body)).toEqual([
      "https://demo.client.factsmgt.com/renweb/email/GetReport.cfm?District=GARCES&SessionID=secret",
    ]);
  });

  test("ignores unrelated links", () => {
    expect(extractFactsUrls("https://example.com/report")).toEqual([]);
  });
});
