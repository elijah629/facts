import { classGrade, gpa, letterGrade } from "@/lib/grades";
import type { Report } from "@/types/report";
import { reportFromCanonical } from "./canonicalize";
import type { GradebookState } from "./types";

function finite(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

export function calculateGradebook(state: GradebookState, weighted = true) {
  const report = reportFromCanonical(state);
  return {
    studentName: state.studentName,
    term: state.term,
    yearRange: state.yearRange,
    gpa: finite(gpa(report.classes, weighted)),
    classes: Object.entries(state.classes).map(([classId, canonical]) => {
      const cls = report.classes.find(
        (item) => item.fullName === canonical.name,
      );
      if (!cls) throw new Error("CANONICAL_PROJECTION_FAILED");
      const percentage = classGrade(cls);
      return {
        id: classId,
        name: cls.displayName,
        fullName: cls.fullName,
        teacher: cls.instructor,
        gradingMethod: cls.gradingMethod,
        percentage: finite(percentage),
        letter: Number.isFinite(percentage) ? letterGrade(percentage) : null,
        categories: cls.sections.map((section) => ({
          name: section.name,
          description: section.description ?? null,
          weight: section.weight ?? null,
          assignmentCount: section.assignments.length,
        })),
      };
    }),
  };
}

export function reportProjection(state: GradebookState): Report {
  return reportFromCanonical(state);
}
