import { describe, expect, test } from "bun:test";
import { validateFactsHtml, validateParsedReport } from "./validate-report";

describe("FACTS validation", () => {
  test("rejects login and expired pages", () => {
    expect(() =>
      validateFactsHtml(
        `<html>${"x".repeat(600)}<input name="password"></html>`,
      ),
    ).toThrow("FACTS_REPORT_EXPIRED_OR_INVALID");
  });

  test("rejects an empty parsed gradebook", () => {
    expect(() =>
      validateParsedReport({
        for: "Student",
        term: "1",
        yearRange: { min: 2026, max: 2027 },
        classes: [],
      }),
    ).toThrow("FACTS_REPORT_STRUCTURE_INVALID");
  });
});
