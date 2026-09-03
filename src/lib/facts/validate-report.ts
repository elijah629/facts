import type { Report } from "@/types/report";

export function validateFactsHtml(html: string): void {
  if (
    html.length < 500 ||
    /back-to-login-link|name=["']password["']|session\s+(?:has\s+)?expired|access\s+denied/i.test(
      html,
    )
  ) {
    throw new Error("FACTS_REPORT_EXPIRED_OR_INVALID");
  }
}

export function validateParsedReport(report: Report): void {
  if (
    !report.for.trim() ||
    !report.term.trim() ||
    !Number.isInteger(report.yearRange.min) ||
    !Number.isInteger(report.yearRange.max) ||
    report.classes.length === 0
  ) {
    throw new Error("FACTS_REPORT_STRUCTURE_INVALID");
  }
  const classNames = new Set<string>();
  for (const cls of report.classes) {
    if (
      !cls.fullName.trim() ||
      !cls.displayName.trim() ||
      !["points", "mixed", "percent"].includes(cls.gradingMethod) ||
      classNames.has(cls.fullName)
    ) {
      throw new Error("FACTS_REPORT_STRUCTURE_INVALID");
    }
    classNames.add(cls.fullName);
  }
}
