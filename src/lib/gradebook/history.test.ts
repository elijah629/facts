import { describe, expect, test } from "bun:test";
import { applyGradebookDelta } from "./apply-delta";
import { diffGradebooks } from "./diff";
import { hashGradebook } from "./hash";
import type { GradebookState } from "./types";

function state(): GradebookState {
  return {
    studentName: "Student",
    term: "1",
    yearRange: { min: 2026, max: 2027 },
    classes: {
      chemistry: {
        name: "Chemistry",
        displayName: "Chemistry",
        teacher: "Teacher",
        term: "1",
        grading: {
          mode: "mixed",
          roundingPrecision: 2,
          categories: {
            tests: { name: "Tests", description: null, weight: "0.7" },
          },
        },
        assignments: {
          a1: {
            name: "Test 1",
            description: null,
            categoryId: "tests",
            earned: "44",
            possible: "50",
            status: "valid",
            excluded: false,
            extraCredit: false,
            dueDate: "2026-09-04T00:00:00.000Z",
            note: null,
            weight: null,
            curve: null,
            bonus: null,
            penalty: null,
          },
        },
      },
    },
  };
}

describe("semantic gradebook history", () => {
  test("diff and apply round-trip all semantic changes", () => {
    const previous = state();
    const next = structuredClone(previous);
    next.classes.chemistry.grading.mode = "points";
    next.classes.chemistry.grading.categories.tests.weight = null;
    next.classes.chemistry.assignments.a1.earned = "45";
    next.classes.chemistry.assignments.a2 = {
      ...next.classes.chemistry.assignments.a1,
      name: "Test 2",
      earned: "18",
      possible: "20",
    };
    expect(
      applyGradebookDelta(previous, diffGradebooks(previous, next)),
    ).toEqual(next);
  });

  test("hash ignores object insertion order", () => {
    const first = state();
    const second = structuredClone(first);
    second.classes = Object.fromEntries(
      Object.entries(second.classes).reverse(),
    );
    expect(hashGradebook(first)).toBe(hashGradebook(second));
  });

  test("meaningful score changes alter hash", () => {
    const first = state();
    const second = structuredClone(first);
    second.classes.chemistry.assignments.a1.earned = "45";
    expect(hashGradebook(first)).not.toBe(hashGradebook(second));
  });
});
