import { describe, expect, test } from "bun:test";
import { applyGradebookDelta } from "./apply-delta";
import { diffGradebooks } from "./diff";
import { hashGradebook } from "./hash";
import { historyChanges } from "./history-changes";
import { state } from "./history-fixture";

describe("semantic gradebook history", () => {
  test("unchanged reports produce no delta or display changes", () => {
    const previous = state();
    expect(diffGradebooks(previous, structuredClone(previous))).toEqual({});
    expect(historyChanges(previous, structuredClone(previous))).toEqual([]);
  });

  test("one assignment groups score and status changes, including null", () => {
    const previous = state();
    const next = structuredClone(previous);
    next.classes.chemistry.assignments.a1.earned = null;
    next.classes.chemistry.assignments.a1.status = "missing";
    const changes = historyChanges(previous, next);
    expect(changes).toHaveLength(1);
    expect(changes[0].summary).toBe(
      "Test 1 changed from 44/50 to not graded; was marked missing",
    );
    expect(changes[0].details).toContainEqual({
      label: "Points earned",
      before: "44",
      after: "—",
    });
    expect(changes[0].details).toContainEqual({
      label: "Status",
      before: "Graded",
      after: "Missing",
    });
    expect(previous.classes.chemistry.assignments.a1.earned).toBe("44");
  });

  test("additions and removals are one entry each, with optional details", () => {
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
    expect(changes).toHaveLength(4);
    expect(changes.find((change) => change.item === "Test 1")).toMatchObject({
      kind: "removed",
      summary: "Test 1 was removed · 44/50",
    });
    expect(changes.find((change) => change.item === "Test 2")).toMatchObject({
      kind: "added",
      summary: "Test 2 was added · 0/50",
    });
    expect(changes.flatMap((change) => change.details)).toContainEqual({
      label: "Weight",
      before: "0.7",
      after: "0.8",
    });
  });

  test("whole class removal suppresses assignment noise", () => {
    const previous = state();
    const next = structuredClone(previous);
    delete next.classes.chemistry;
    next.yearRange.max = 2028;
    const changes = historyChanges(previous, next);
    expect(changes).toHaveLength(2);
    expect(changes.find((change) => change.item === "Chemistry")).toMatchObject(
      { kind: "removed", summary: "Chemistry was removed" },
    );
    expect(changes.some((change) => change.item === "Test 1")).toBe(false);
    expect(changes.flatMap((change) => change.details)).toContainEqual({
      label: "School year",
      before: "2026–2027",
      after: "2026–2028",
    });
  });

  test("notes and due dates stay in details, not separate feed entries", () => {
    const previous = state();
    const next = structuredClone(previous);
    next.classes.chemistry.assignments.a1.note = "Retake available";
    next.classes.chemistry.assignments.a1.dueDate = "2026-09-05T00:00:00.000Z";
    const changes = historyChanges(previous, next);
    expect(changes).toHaveLength(1);
    expect(changes[0].summary).toBe("Test 1 was updated");
    expect(changes[0].details).toHaveLength(2);
    expect(
      changes[0].details.find((detail) => detail.label === "Due date")?.after,
    ).toBe("Sep 5, 2026");
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
