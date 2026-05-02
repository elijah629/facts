import type { Assignment, Class, Report, Section } from "@/types/report";
import { assignmentPoints, classGrade, letterGrade } from "./grades";

export type AssignmentInsight = {
  assignment: Assignment;
  cls: Class;
  classIndex: number;
  section: Section;
};

export type ClassInsight = {
  cls: Class;
  classIndex: number;
  percentage: number;
  letter: string;
};

export type WeakAssignmentInsight = AssignmentInsight & {
  grade: number;
  classPercentage: number;
  gap: number;
};

export type StudentInsights = {
  lowestClasses: ClassInsight[];
  upcomingAssignments: AssignmentInsight[];
  missingAssignments: AssignmentInsight[];
  weakAssignments: WeakAssignmentInsight[];
};

function hasGradableAssignments(cls: Class): boolean {
  return cls.sections.some((section) =>
    section.assignments.some((assignment) => {
      const { maxPoints } = assignmentPoints(assignment);

      return assignment.status !== "excuse" && maxPoints > 0;
    }),
  );
}

function allAssignments(report: Report): AssignmentInsight[] {
  return report.classes.flatMap((cls, classIndex) =>
    cls.sections.flatMap((section) =>
      section.assignments.map((assignment) => ({
        assignment,
        cls,
        classIndex,
        section,
      })),
    ),
  );
}

export function getStudentInsights(report: Report): StudentInsights {
  const assignments = allAssignments(report);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const classSummaries = report.classes
    .map((cls, classIndex): ClassInsight | undefined => {
      if (!hasGradableAssignments(cls)) {
        return undefined;
      }

      const percentage = classGrade(cls);

      if (!Number.isFinite(percentage)) {
        return undefined;
      }

      return {
        cls,
        classIndex,
        percentage,
        letter: letterGrade(percentage),
      };
    })
    .filter((summary): summary is ClassInsight => Boolean(summary));

  const classPercentages = new Map(
    classSummaries.map((summary) => [summary.classIndex, summary.percentage]),
  );

  const upcomingAssignments = assignments
    .filter(
      ({ assignment }) => new Date(assignment.due).getTime() >= today.getTime(),
    )
    .sort(
      (a, b) =>
        new Date(a.assignment.due).getTime() -
        new Date(b.assignment.due).getTime(),
    )
    .slice(0, 5);

  const missingAssignments = assignments
    .filter(({ assignment }) => assignment.status === "missing")
    .sort(
      (a, b) =>
        new Date(b.assignment.due).getTime() -
        new Date(a.assignment.due).getTime(),
    )
    .slice(0, 5);

  const weakAssignments = assignments
    .flatMap((insight): WeakAssignmentInsight[] => {
      const classPercentage = classPercentages.get(insight.classIndex);

      if (
        classPercentage === undefined ||
        insight.assignment.status === "excuse"
      ) {
        return [];
      }

      const { points, maxPoints } = assignmentPoints(insight.assignment);

      if (maxPoints <= 0) {
        return [];
      }

      const grade = points / maxPoints;
      const gap = classPercentage - grade;

      return gap > 0
        ? [
            {
              ...insight,
              grade,
              classPercentage,
              gap,
            },
          ]
        : [];
    })
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 5);

  return {
    lowestClasses: classSummaries
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 3),
    upcomingAssignments,
    missingAssignments,
    weakAssignments,
  };
}
