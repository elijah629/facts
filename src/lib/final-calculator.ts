import {
  classGrade,
  sectionGradePoints,
  sectionGradeUnweighted,
  sectionGradeWeighted,
} from "@/lib/grades";
import type { Assignment, Class } from "@/types/report";

export const FINAL_SEARCH_MAX = 200;

export type FinalProjectionOptions = {
  finalPercent: number;
  finalPossiblePoints: number;
  finalSectionIndex: number;
  replaceSectionIndex?: number;
};

export function assignmentPercent(assignment: Assignment): number | null {
  if (assignment.status === "excuse" || assignment.maxPoints === 0) {
    return null;
  }

  return assignment.status === "missing"
    ? 0
    : assignment.points / assignment.maxPoints;
}

export function sectionGradeForClass(
  cls: Class,
  sectionIndex: number,
): number | false {
  const section = cls.sections[sectionIndex];

  if (!section) {
    return false;
  }

  if (cls.gradingMethod === "points") {
    const points = sectionGradePoints(section);

    return points.possiblePoints > 0
      ? points.totalPoints / points.possiblePoints
      : false;
  }

  return cls.gradingMethod === "mixed"
    ? sectionGradeWeighted(section, cls.roundingPrecision)
    : sectionGradeUnweighted(section);
}

export function findFinalSectionIndex(cls: Class): number {
  const index = cls.sections.findIndex((section) =>
    section.name.toLowerCase().includes("final"),
  );

  return index === -1 ? 0 : index;
}

export function findLowestAssignment(
  cls: Class | undefined,
  sectionIndex: number | undefined,
): { assignment: Assignment; index: number; percent: number } | null {
  const section =
    cls && sectionIndex !== undefined ? cls.sections[sectionIndex] : undefined;

  if (!section) {
    return null;
  }

  return section.assignments.reduce<{
    assignment: Assignment;
    index: number;
    percent: number;
  } | null>((lowest, assignment, index) => {
    const percent = assignmentPercent(assignment);

    if (percent === null || (lowest && percent >= lowest.percent)) {
      return lowest;
    }

    return { assignment, index, percent };
  }, null);
}

function replaceLowestScore(
  cls: Class,
  sectionIndex: number | undefined,
  finalPercent: number,
): Class {
  const lowest = findLowestAssignment(cls, sectionIndex);

  if (sectionIndex === undefined || !lowest || finalPercent <= lowest.percent) {
    return cls;
  }

  return {
    ...cls,
    sections: cls.sections.map((section, currentSectionIndex) => {
      if (currentSectionIndex !== sectionIndex) {
        return section;
      }

      return {
        ...section,
        assignments: section.assignments.map((assignment, assignmentIndex) => {
          if (assignmentIndex !== lowest.index) {
            return assignment;
          }

          const maxPoints =
            assignment.status === "valid" || assignment.status === "missing"
              ? assignment.maxPoints
              : 100;

          return {
            ...assignment,
            maxPoints,
            name: `${assignment.name} (replaced by final)`,
            points: finalPercent * maxPoints,
            status: "valid" as const,
          };
        }),
      };
    }),
  };
}

export function gradeWithFinal(
  cls: Class,
  options: FinalProjectionOptions,
): number | null {
  const {
    finalPercent,
    finalPossiblePoints,
    finalSectionIndex,
    replaceSectionIndex,
  } = options;

  if (
    !Number.isFinite(finalPercent) ||
    finalPercent < 0 ||
    !Number.isFinite(finalPossiblePoints) ||
    finalPossiblePoints <= 0 ||
    !cls.sections[finalSectionIndex]
  ) {
    return null;
  }

  const improvedClass = replaceLowestScore(
    cls,
    replaceSectionIndex === finalSectionIndex ? undefined : replaceSectionIndex,
    finalPercent,
  );
  const finalSection = improvedClass.sections[finalSectionIndex];
  const nextSourceIndex =
    Math.max(
      -1,
      ...finalSection.assignments.map(({ sourceIndex }) => sourceIndex),
    ) + 1;
  const hypotheticalFinal: Assignment = {
    due: new Date(0),
    maxPoints: finalPossiblePoints,
    name: "Final exam (what-if)",
    points: finalPercent * finalPossiblePoints,
    sourceIndex: nextSourceIndex,
    status: "valid",
  };
  const projectedClass: Class = {
    ...improvedClass,
    sections: improvedClass.sections.map((section, sectionIndex) =>
      sectionIndex === finalSectionIndex
        ? {
            ...section,
            assignments: [...section.assignments, hypotheticalFinal],
          }
        : section,
    ),
  };
  const grade = classGrade(projectedClass);

  return Number.isFinite(grade) ? grade : null;
}

export function requiredFinalScore(
  cls: Class,
  options: Omit<FinalProjectionOptions, "finalPercent"> & {
    targetPercent: number;
  },
): { score: number | null; minGrade: number | null; maxGrade: number | null } {
  const { targetPercent, ...projectionOptions } = options;
  const minGrade = gradeWithFinal(cls, {
    ...projectionOptions,
    finalPercent: 0,
  });
  const maxGrade = gradeWithFinal(cls, {
    ...projectionOptions,
    finalPercent: FINAL_SEARCH_MAX / 100,
  });

  if (
    !Number.isFinite(targetPercent) ||
    targetPercent < 0 ||
    minGrade === null ||
    maxGrade === null
  ) {
    return { maxGrade, minGrade, score: null };
  }

  if (targetPercent <= minGrade) {
    return { maxGrade, minGrade, score: 0 };
  }

  if (targetPercent > maxGrade) {
    return { maxGrade, minGrade, score: null };
  }

  let low = 0;
  let high = FINAL_SEARCH_MAX;

  for (let iteration = 0; iteration < 50; iteration++) {
    const score = (low + high) / 2;
    const grade = gradeWithFinal(cls, {
      ...projectionOptions,
      finalPercent: score / 100,
    });

    if (grade !== null && grade >= targetPercent) {
      high = score;
    } else {
      low = score;
    }
  }

  return { maxGrade, minGrade, score: high };
}
