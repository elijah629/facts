import type { Assignment, Class, Section } from "@/types/report";

export enum LetterGrade {
  Ap = "A+",
  A = "A",
  Am = "A-",
  Bp = "B+",
  B = "B",
  Bm = "B-",
  Cp = "C+",
  C = "C",
  Cm = "C-",
  Dp = "D+",
  D = "D",
  Dm = "D-",
  F = "F",
}

export const GPA_WEIGHTS: Record<ClassType, Record<LetterGrade, number>> = {
  regular: {
    [LetterGrade.Ap]: 4.3,
    [LetterGrade.A]: 4.0,
    [LetterGrade.Am]: 3.7,
    [LetterGrade.Bp]: 3.3,
    [LetterGrade.B]: 3.0,
    [LetterGrade.Bm]: 2.7,
    [LetterGrade.Cp]: 2.3,
    [LetterGrade.C]: 2.0,
    [LetterGrade.Cm]: 1.7,
    [LetterGrade.Dp]: 1.3,
    [LetterGrade.D]: 1.0,
    [LetterGrade.Dm]: 0.7,
    [LetterGrade.F]: 0.0,
  },
  weighted: {
    [LetterGrade.Ap]: 5.3,
    [LetterGrade.A]: 5.0,
    [LetterGrade.Am]: 4.7,
    [LetterGrade.Bp]: 4.3,
    [LetterGrade.B]: 4.0,
    [LetterGrade.Bm]: 3.7,
    [LetterGrade.Cp]: 3.3,
    [LetterGrade.C]: 3.0,
    [LetterGrade.Cm]: 1.7,
    [LetterGrade.Dp]: 1.3,
    [LetterGrade.D]: 1.0,
    [LetterGrade.Dm]: 0.7,
    [LetterGrade.F]: 0.0,
  },
};

// [min, max)
export const LETTER_RANGES: Record<LetterGrade, { min: number; max: number }> =
  {
    [LetterGrade.Ap]: { min: 0.98, max: 1.0 },
    [LetterGrade.A]: { min: 0.93, max: 0.98 },
    [LetterGrade.Am]: { min: 0.9, max: 0.93 },
    [LetterGrade.Bp]: { min: 0.87, max: 0.9 },
    [LetterGrade.B]: { min: 0.83, max: 0.87 },
    [LetterGrade.Bm]: { min: 0.8, max: 0.83 },
    [LetterGrade.Cp]: { min: 0.77, max: 0.8 },
    [LetterGrade.C]: { min: 0.73, max: 0.77 },
    [LetterGrade.Cm]: { min: 0.7, max: 0.73 },
    [LetterGrade.Dp]: { min: 0.67, max: 0.7 },
    [LetterGrade.D]: { min: 0.63, max: 0.67 },
    [LetterGrade.Dm]: { min: 0.6, max: 0.63 },
    [LetterGrade.F]: { min: 0.0, max: 0.6 },
  };

export function letterGrade(percentage: number): LetterGrade {
  if (percentage >= LETTER_RANGES[LetterGrade.Ap].min) return LetterGrade.Ap;
  if (percentage >= LETTER_RANGES[LetterGrade.A].min) return LetterGrade.A;
  if (percentage >= LETTER_RANGES[LetterGrade.Am].min) return LetterGrade.Am;
  if (percentage >= LETTER_RANGES[LetterGrade.Bp].min) return LetterGrade.Bp;
  if (percentage >= LETTER_RANGES[LetterGrade.B].min) return LetterGrade.B;
  if (percentage >= LETTER_RANGES[LetterGrade.Bm].min) return LetterGrade.Bm;
  if (percentage >= LETTER_RANGES[LetterGrade.Cp].min) return LetterGrade.Cp;
  if (percentage >= LETTER_RANGES[LetterGrade.C].min) return LetterGrade.C;
  if (percentage >= LETTER_RANGES[LetterGrade.Cm].min) return LetterGrade.Cm;
  if (percentage >= LETTER_RANGES[LetterGrade.Dp].min) return LetterGrade.Dp;
  if (percentage >= LETTER_RANGES[LetterGrade.D].min) return LetterGrade.D;
  if (percentage >= LETTER_RANGES[LetterGrade.Dm].min) return LetterGrade.Dm;

  return LetterGrade.F;
}

type ClassType = "regular" | "weighted";

export function classGpa(cls: Class, classType: ClassType | undefined): number {
  const p = classGrade(cls);

  const cT: ClassType = classType
    ? classType
    : cls.displayName.endsWith("(H)") || cls.displayName.startsWith("AP")
      ? "weighted"
      : "regular";

  return GPA_WEIGHTS[cT][letterGrade(p)];
}

export function gpa(classes: Class[], weighted: boolean = true): number {
  const totalGp = classes.reduce(
    (sum, cls) => sum + classGpa(cls, weighted ? undefined : "regular"),
    0,
  );

  return classes.length > 0 ? totalGp / classes.length : 0;
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

export function sectionGrade(section: Section): number | false {
  const { totalPoints, possiblePoints } = sectionPoints(section);

  if (possiblePoints === 0) {
    return false;
  }

  return totalPoints / possiblePoints;
}

export function sectionAverage(section: Section): number | false {
  if (section.assignments.length === 0) {
    return false;
  }

  const avgs = section.assignments.map(assignmentPoints).map(({ points, maxPoints }) => points / maxPoints);
  const avg = avgs.reduce((a, b) => a + b) / avgs.length;

  return avg;
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
        const grade = cls.gradingMethod === "mixed" ? sectionGrade(section) : sectionAverage(section);

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
