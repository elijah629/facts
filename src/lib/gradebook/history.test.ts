import { describe, expect, test } from "bun:test";
import { applyGradebookDelta } from "./apply-delta";
import { diffGradebooks } from "./diff";
import { hashGradebook } from "./hash";
import { historyChanges } from "./history-changes";
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
  test("unchanged reports produce no delta or display changes", () => {
    const previous = state();
    expect(diffGradebooks(previous, structuredClone(previous))).toEqual({});
    expect(historyChanges(previous, structuredClone(previous))).toEqual([]);
  });

  test("history shows score and status before and after, including null", () => {
    const previous = state();
    const next = structuredClone(previous);
    next.classes.chemistry.assignments.a1.earned = null;
    next.classes.chemistry.assignments.a1.status = "missing";
    const changes = historyChanges(previous, next);
    expect(changes).toHaveLength(2);
    expect(
      changes.find((change) => change.field === "Points earned"),
    ).toMatchObject({
      item: "Test 1",
      before: "44",
      after: "—",
      kind: "changed",
    });
    expect(changes.find((change) => change.field === "Status")).toMatchObject({
      before: "valid",
      after: "missing",
    });
    expect(previous.classes.chemistry.assignments.a1.earned).toBe("44");
  });

  test("history includes additions, removals and grading configuration", () => {
    const previous = state();
    const next = structuredClone(previous);
    delete next.classes.chemistry.assignments.a1;
    next.classes.chemistry.assignments.a2 = {
      ...previous.classes.chemistry.assignments.a1,
      name: "Test 2",
      earned: "0",
    };
    next.classes.chemistry.grading.categories.tests.weight = "0.8";
    next.classes.chemistry.grading.roundingPrecision = 3;
    const changes = historyChanges(previous, next);
    expect(
      changes.find(
        (change) => change.item === "Test 1" && change.field === "Record",
      ),
    ).toMatchObject({ kind: "removed", after: "Removed" });
    expect(
      changes.find(
        (change) =>
          change.item === "Test 2" && change.field === "Points earned",
      ),
    ).toMatchObject({ kind: "added", after: "0" });
    expect(changes.find((change) => change.field === "Weight")).toMatchObject({
      before: "0.7",
      after: "0.8",
    });
    expect(
      changes.find((change) => change.field === "Rounding precision"),
    ).toMatchObject({ before: "2", after: "3" });
  });

  test("history retains removed class details and school-year changes", () => {
    const previous = state();
    const next = structuredClone(previous);
    delete next.classes.chemistry;
    next.yearRange.max = 2028;
    const changes = historyChanges(previous, next);
    expect(
      changes.find(
        (change) => change.item === "Class" && change.field === "Record",
      ),
    ).toMatchObject({ className: "Chemistry", kind: "removed" });
    expect(
      changes.find((change) => change.field === "School year ends"),
    ).toMatchObject({ before: "2027", after: "2028" });
  });

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
