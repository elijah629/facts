import { describe, expect, test } from "bun:test";
import type { Assignment, Class, Section } from "@/types/report";
import { gradeWithFinal, requiredFinalScore } from "./final-calculator";

function assignment(
  points: number,
  maxPoints: number,
  sourceIndex = 0,
): Assignment {
  return {
    due: new Date("2026-08-30T00:00:00Z"),
    maxPoints,
    name: "Assignment",
    points,
    sourceIndex,
    status: "valid",
  };
}

function section(
  name: string,
  assignments: Assignment[],
  weight?: number,
): Section {
  return { assignments, name, weight };
}

function cls(
  gradingMethod: Class["gradingMethod"],
  sections: Section[],
): Class {
  return {
    displayName: "Test class",
    fullName: "TEST-1",
    gradingMethod,
    instructor: "Teacher",
    roundingPrecision: 2,
    sections,
  };
}

describe("final calculator", () => {
  test("adds a points-based final using its actual possible points", () => {
    const course = cls("points", [
      section("Coursework", [assignment(80, 100)]),
      section("Final", []),
    ]);

    expect(
      gradeWithFinal(course, {
        finalPercent: 0.9,
        finalPossiblePoints: 100,
        finalSectionIndex: 1,
      }),
    ).toBeCloseTo(0.85);
  });

  test.each(["mixed", "percent"] as const)(
    "uses the regular %s class engine for an empty weighted final category",
    (gradingMethod) => {
      const course = cls(gradingMethod, [
        section("Coursework", [assignment(80, 100)], 0.5),
        section("Final", [], 0.5),
      ]);

      expect(
        gradeWithFinal(course, {
          finalPercent: 1,
          finalPossiblePoints: 100,
          finalSectionIndex: 1,
        }),
      ).toBeCloseTo(0.9);
    },
  );

  test("adds the final alongside existing work in a percent category", () => {
    const course = cls("percent", [
      section("Coursework", [assignment(80, 100)], 0.5),
      section("Final", [assignment(50, 100)], 0.5),
    ]);

    expect(
      gradeWithFinal(course, {
        finalPercent: 1,
        finalPossiblePoints: 100,
        finalSectionIndex: 1,
      }),
    ).toBeCloseTo(0.775);
  });

  test("can replace the lowest score and add a points-based final", () => {
    const course = cls("points", [
      section("Coursework", [assignment(50, 100)]),
      section("Final", []),
    ]);

    expect(
      gradeWithFinal(course, {
        finalPercent: 0.9,
        finalPossiblePoints: 100,
        finalSectionIndex: 1,
        replaceSectionIndex: 0,
      }),
    ).toBeCloseTo(0.9);
  });

  test("solves the required score for a points class", () => {
    const course = cls("points", [
      section("Coursework", [assignment(80, 100)]),
      section("Final", []),
    ]);
    const result = requiredFinalScore(course, {
      finalPossiblePoints: 100,
      finalSectionIndex: 1,
      targetPercent: 0.9,
    });

    expect(result.score).toBeCloseTo(100);
    expect(result.minGrade).toBeCloseTo(0.4);
    expect(result.maxGrade).toBeCloseTo(1.4);
  });
});
