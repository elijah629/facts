import { roundTo } from "@/lib/utils";
import type { Section } from "@/types/report";
import { assignmentPoints } from ".";

export function sectionGradeWeighted(
  section: Section,
  roundingPrecision: number,
): number | false {
  const assignments = section.assignments.filter((a) => a.status !== "excuse");

  const points = section.assignments.map(assignmentPoints);

  const totalPoints = points.reduce((sum, { points }) => sum + points, 0);
  const possiblePoints = points.reduce(
    (sum, { maxPoints }) => sum + maxPoints,
    0,
  );

  if (assignments.length === 0 || possiblePoints === 0) {
    return false;
  }

  const firstMax = points[0].maxPoints;

  const allSameNonZeroMax =
    points.every(({ maxPoints }) => maxPoints === firstMax) && firstMax !== 0;
  const anyMaxZero = points.some(({ maxPoints }) => maxPoints === 0);

  if (allSameNonZeroMax && !anyMaxZero) {
    const roundedPercents = points.map(({ points, maxPoints }) =>
      roundTo(points / Math.max(1, maxPoints), 2),
    );

    const sum = roundedPercents.reduce((s, v) => s + v, 0);
    const meanPercent = sum / roundedPercents.length;

    return roundTo(meanPercent, roundingPrecision + 2);
  } else {
    return roundTo(totalPoints / possiblePoints, roundingPrecision + 2);
  }
}

export function sectionGradeUnweighted(section: Section): number | false {
  const assignments = section.assignments.filter((x) => x.status !== "excuse");

  let assignmentWeight = 0;
  let percentageSum = 0;

  for (const assignment of assignments) {
    const points = assignmentPoints(assignment);
    const weight = assignment.weight ?? 1;

    if (weight <= 0) {
      continue;
    }

    if (points.maxPoints > 0) {
      percentageSum += (points.points / points.maxPoints) * weight;
      assignmentWeight += weight;
    } else {
      // In FACTS PERCENT classes, a 1/0 extra-credit score contributes one
      // percentage point to the category total without adding another item to
      // the averaging denominator.
      percentageSum += (points.points / 100) * weight;
    }
  }

  return assignmentWeight === 0 ? false : percentageSum / assignmentWeight;
}

export function sectionGradePoints(section: Section): {
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
