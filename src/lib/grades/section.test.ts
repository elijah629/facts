import { describe, expect, test } from "bun:test";
import type { Assignment, Class, Section } from "@/types/report";
import { classGrade, sectionGradeUnweighted } from ".";

function assignment(
  points: number,
  maxPoints: number,
  sourceIndex: number,
): Assignment {
  return {
    due: new Date("2026-08-30T00:00:00Z"),
    maxPoints,
    name: `Assignment ${sourceIndex}`,
    points,
    sourceIndex,
    status: "valid",
  };
}

function section(
  name: string,
  weight: number,
  assignments: Assignment[],
): Section {
  return { assignments, name, weight };
}

describe("FACTS PERCENT grading", () => {
  test("matches the Algebra II (H) Homework category", () => {
    const homework = section("Homework", 0.15, [
      assignment(5, 5, 0),
      assignment(5, 5, 1),
      assignment(1, 0, 2),
      assignment(5, 5, 3),
      assignment(5, 5, 4),
      assignment(10, 10, 5),
      assignment(5, 5, 6),
    ]);

    expect(sectionGradeUnweighted(homework)).toBeCloseTo(1.0016666667);
  });

  test("uses the assignment weights printed by PERCENT reports", () => {
    const weighted = section("Weighted work", 1, [
      { ...assignment(10, 10, 0), weight: 2 },
      { ...assignment(0, 10, 1), weight: 1 },
    ]);

    expect(sectionGradeUnweighted(weighted)).toBeCloseTo(2 / 3);
  });

  test("matches the Algebra II (H) FACTS term grade of 100.85%", () => {
    const algebra: Class = {
      displayName: "Algebra II (H)",
      fullName: "MATH 302 - 5",
      gradingMethod: "percent",
      instructor: "Teacher",
      roundingPrecision: 2,
      sections: [
        section("Final Exam", 0.2, []),
        section("Homework", 0.15, [
          assignment(5, 5, 0),
          assignment(5, 5, 1),
          assignment(1, 0, 2),
          assignment(5, 5, 3),
          assignment(5, 5, 4),
          assignment(10, 10, 5),
          assignment(5, 5, 6),
        ]),
        section("Participation", 0.15, [
          assignment(5, 5, 0),
          assignment(5, 5, 1),
        ]),
        section("Quizzes", 0.2, [assignment(102, 100, 0)]),
        section("Tests", 0.3, []),
      ],
    };

    expect(classGrade(algebra)).toBeCloseTo(1.0085);
  });
});
