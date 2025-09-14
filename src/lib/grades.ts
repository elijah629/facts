import type { Assignment, Class, Section } from "@/types/report";

export function letterGrade(percentage: number): string {
  if (percentage >= 0.98) return "A+";
  if (percentage >= 0.93) return "A";
  if (percentage >= 0.9) return "A-";
  if (percentage >= 0.87) return "B+";
  if (percentage >= 0.83) return "B";
  if (percentage >= 0.8) return "B-";
  if (percentage >= 0.77) return "C+";
  if (percentage >= 0.73) return "C";
  if (percentage >= 0.7) return "C-";
  if (percentage >= 0.67) return "D+";
  if (percentage >= 0.63) return "D";
  if (percentage >= 0.6) return "D-";

  return "F";
}

type ClassType = "regular" | "weighted";

export function classGpa(cls: Class, classType: ClassType | undefined): number {
  const p = classGrade(cls);
  const cT: ClassType = classType
    ? classType
    : cls.displayName.endsWith("(H)") || cls.displayName.startsWith("AP")
      ? "weighted"
      : "regular";

  const maxGPA = cT === "weighted" ? 5.3 : 4.3;
  const pct = Math.min(p, 1.0);

  let gpa: number;

  if (cT === "weighted") {
    gpa =
      pct >= 0.98
        ? 5.3
        : pct >= 0.93
          ? 5.0 + ((pct - 0.93) * (5.3 - 5.0)) / (0.98 - 0.93)
          : pct >= 0.9
            ? 4.7 + ((pct - 0.9) * (5.0 - 4.7)) / (0.93 - 0.9)
            : pct >= 0.87
              ? 4.3 + ((pct - 0.87) * (4.7 - 4.3)) / (0.9 - 0.87)
              : pct >= 0.83
                ? 4.0 + ((pct - 0.83) * (4.3 - 4.0)) / (0.87 - 0.83)
                : pct >= 0.8
                  ? 3.7 + ((pct - 0.8) * (4.0 - 3.7)) / (0.83 - 0.8)
                  : pct >= 0.77
                    ? 3.3 + ((pct - 0.77) * (3.7 - 3.3)) / (0.8 - 0.77)
                    : pct >= 0.73
                      ? 3.0 + ((pct - 0.73) * (3.3 - 3.0)) / (0.77 - 0.73)
                      : pct >= 0.7
                        ? 1.7 + ((pct - 0.7) * (3.0 - 1.7)) / (0.73 - 0.7)
                        : pct >= 0.67
                          ? 1.3 + ((pct - 0.67) * (1.7 - 1.3)) / (0.7 - 0.67)
                          : pct >= 0.63
                            ? 1.0 + ((pct - 0.63) * (1.3 - 1.0)) / (0.67 - 0.63)
                            : pct >= 0.6
                              ? 0.7 + ((pct - 0.6) * (1.0 - 0.7)) / (0.63 - 0.6)
                              : 0;
  } else {
    gpa =
      pct >= 0.98
        ? 4.3
        : pct >= 0.93
          ? 4.0 + ((pct - 0.93) * (4.3 - 4.0)) / (0.98 - 0.93)
          : pct >= 0.9
            ? 3.7 + ((pct - 0.9) * (4.0 - 3.7)) / (0.93 - 0.9)
            : pct >= 0.87
              ? 3.3 + ((pct - 0.87) * (3.7 - 3.3)) / (0.9 - 0.87)
              : pct >= 0.83
                ? 3.0 + ((pct - 0.83) * (3.3 - 3.0)) / (0.87 - 0.83)
                : pct >= 0.8
                  ? 2.7 + ((pct - 0.8) * (3.0 - 2.7)) / (0.83 - 0.8)
                  : pct >= 0.77
                    ? 2.3 + ((pct - 0.77) * (2.7 - 2.3)) / (0.8 - 0.77)
                    : pct >= 0.73
                      ? 2.0 + ((pct - 0.73) * (2.3 - 2.0)) / (0.77 - 0.73)
                      : pct >= 0.7
                        ? 1.7 + ((pct - 0.7) * (2.0 - 1.7)) / (0.73 - 0.7)
                        : pct >= 0.67
                          ? 1.3 + ((pct - 0.67) * (1.7 - 1.3)) / (0.7 - 0.67)
                          : pct >= 0.63
                            ? 1.0 + ((pct - 0.63) * (1.3 - 1.0)) / (0.67 - 0.63)
                            : pct >= 0.6
                              ? 0.7 + ((pct - 0.6) * (1.0 - 0.7)) / (0.63 - 0.6)
                              : 0;
  }

  return p <= 1 ? gpa : gpa + (p - 1) * maxGPA;
}

export function gpa(classes: Class[], weighted: boolean = true): number {
  const totalGp = classes.reduce(
    (sum, cls) => sum + classGpa(cls, weighted ? undefined : "regular"),
    0,
  );

  return classes.length > 0 ? totalGp / classes.length : 0;
}

export function sectionGrade(section: Section): false | number {
  const { totalPoints, possiblePoints } = sectionPoints(section);

  if (possiblePoints === 0) {
    return false;
  }

  return totalPoints / possiblePoints;
}

export function sectionPoints(section: Section): {
  totalPoints: number;
  possiblePoints: number;
} {
  if (section.assignments.length === 0) {
    return { totalPoints: 0, possiblePoints: 0 };
  }

  const points = section.assignments.map(assignmentPoints);

  const totalPoints = points.reduce((sum, { points }) => sum + points, 0);
  const possiblePoints = points.reduce(
    (sum, { maxPoints }) => sum + maxPoints,
    0,
  );

  return { totalPoints, possiblePoints };
}

export function classGrade(cls: Class): number {
  switch (cls.gradingMethod) {
    case "points": {
      let totalPoints = 0;
      let possiblePoints = 0;

      for (const section of cls.sections) {
        const points = sectionPoints(section);

        totalPoints += points.totalPoints;
        possiblePoints += points.possiblePoints;
      }

      return totalPoints / possiblePoints;
    }
    case "mixed":
    case "percent": {
      let weightedSum = 0;
      let totalWeight = 0; // is not always 1, for sections without assisgnments

      for (const section of cls.sections) {
        const grade = sectionGrade(section);

        if (grade === false) {
          continue;
        }

        weightedSum += grade * (section.weight ?? 0);
        totalWeight += section.weight ?? 0;
      }

      return weightedSum / totalWeight;
    }
  }
}

export function assignmentPoints(assignment: Assignment): {
  points: number;
  maxPoints: number;
} {
  if (assignment.status === "valid") {
    return { points: assignment.points, maxPoints: assignment.maxPoints };
  }

  if (assignment.status === "missing") {
    return { points: 0, maxPoints: assignment.maxPoints };
  }

  if (assignment.status === "excuse") {
    return { points: 0, maxPoints: 0 };
  }

  return { points: 0, maxPoints: 0 };
}
