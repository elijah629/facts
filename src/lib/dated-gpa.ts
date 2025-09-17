import type { Class, Report } from "@/types/report";
import { gpa } from "./grades";

export interface GpaSnapshot {
  date: Date;
  gpa: number;
}

export function generateGpaChartData(
  report: Report,
  useWeightedGpa: boolean = true,
): GpaSnapshot[] {
  const allAssignments = report.classes.flatMap((cls) =>
    cls.sections.flatMap((section) =>
      section.assignments.map((assignment) => ({
        cls,
        section,
        assignment,
      })),
    ),
  );

  if (allAssignments.length === 0) {
    return [{ date: new Date(), gpa: 0 }];
  }

  const uniqueTimes = Array.from(
    new Set(allAssignments.map((x) => new Date(x.assignment.due).getTime())),
  ).sort((a, b) => a - b);

  const snapshots: GpaSnapshot[] = [];

  const firstTime = uniqueTimes[0];
  const oneDayMs = 24 * 60 * 60 * 1000;
  snapshots.push({ date: new Date(firstTime - oneDayMs), gpa: 0 });

  for (const t of uniqueTimes) {
    const snapshotDate = new Date(t);

    const classesAtSnapshot: Class[] = report.classes.map((cls) => ({
      ...cls,
      sections: cls.sections.map((section) => ({
        ...section,
        assignments: section.assignments.filter(
          (a) => new Date(a.due).getTime() <= t,
        ),
      })),
    }));

    const currentGpa = gpa(classesAtSnapshot, useWeightedGpa);

    snapshots.push({
      date: snapshotDate,
      gpa: currentGpa,
    });
  }

  return snapshots;
}
