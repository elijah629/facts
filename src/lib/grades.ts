import { Assignment, Class, Section } from "@/types/report";

export function letterGrade(percentage: number): string {
  if (percentage >= 97) return "A+";
  if (percentage >= 93) return "A";
  if (percentage >= 90) return "A-";
  if (percentage >= 87) return "B+";
  if (percentage >= 83) return "B";
  if (percentage >= 80) return "B-";
  if (percentage >= 77) return "C+";
  if (percentage >= 73) return "C";
  if (percentage >= 70) return "C-";
  if (percentage >= 67) return "D+";
  if (percentage >= 63) return "D";
  if (percentage >= 60) return "D-";

  return "F";
}

export function sectionGrade(section: Section): false | number {
  if (section.assignments.length === 0) {
    return false;
  }

  const points = section.assignments.map(assignmentPoints);

  const totalPoints = points.reduce((sum, { points }) => sum + points, 0);
  const maximalPoints = points.reduce(
    (sum, { maxPoints }) => sum + maxPoints,
    0,
  );

  const percentage = (totalPoints / maximalPoints) * 100;

  return percentage;
}

export function classGrade(cls: Class): number {
  let weightedSum = 0;
  let totalWeight = 0; // is not always 1, for sections without assisgnments

  for (const section of cls.sections) {
    const grade = sectionGrade(section);

    if (grade === false) {
      continue;
    }

    weightedSum += grade * section.weight;
    totalWeight += section.weight;
  }

  return weightedSum / totalWeight;
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

    totalPoints += grade / 100;
  }

  return classes.length > 0 ? (totalPoints / classes.length) * 4.3 : 0;
}
