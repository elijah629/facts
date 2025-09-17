import { Report } from "@/types/report";

/// Last, First -> First Last
export function formatName(name: string) {
  const [last, first] = name.split(", ");
  return first.trim() + " " + last.trim();
}

export function normalizeWeights(weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);

  if (total === 0) {
    return weights.fill(0);
  }

  return weights.map((x) => x / total);
}

export function yearDates(
  dates: Date[],
  yearRange: { min: number; max: number },
): Date[] {
  if (dates.length === 0) return [];

  let year = yearRange.min;
  let prevOrdinal = -1;

  return dates.map((orig) => {
    const d = new Date(orig.getTime());

    const monthIndex = d.getMonth();
    const dayOfMonth = d.getDate();

    const ordinal = (monthIndex + 1) * 100 + dayOfMonth;

    if (prevOrdinal !== -1 && ordinal < prevOrdinal) {
      year = Math.min(year + 1, yearRange.max);
    }
    prevOrdinal = ordinal;

    d.setFullYear(year);

    return d;
  });
}

export function fullyDateReport(report: Report): Report {
  for (const cls of report.classes) {
    for (const section of cls.sections) {
      const dates = section.assignments.map((a) => a.due);
      if (dates.length === 0) continue;

      const dated = yearDates(dates, report.yearRange);

      for (let i = 0; i < section.assignments.length; i++) {
        section.assignments[i].due = dated[i];
      }
    }
  }

  return report;
}
