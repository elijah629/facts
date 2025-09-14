import type { Assignment, Class, Section } from "@/types/report";

export function letterGrade(percentage: number): string {
  if (percentage >= 0.97) return "A+";
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

export function gpa(classes: Class[]): number {
  // 4.3 scale. TODO: Honors 5.3 scale boost
  let totalPoints = 0;

  for (const cls of classes) {
    const grade = classGrade(cls);

    totalPoints += grade;
  }

  return classes.length > 0 ? (totalPoints / classes.length) * 4.3 : 0;
}
