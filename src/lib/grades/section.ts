import type { Section } from "@/types/report";
import { roundTo } from "@/lib/utils";
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

  if (assignments.length === 0) {
    return false;
  }

  const points = assignments.map(assignmentPoints);

  return (
    points
      .map(({ points, maxPoints }) => points / Math.max(1, maxPoints))
      .reduce((a, b) => a + b) / points.length
  );
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
