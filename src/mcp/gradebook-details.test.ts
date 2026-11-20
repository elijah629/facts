import { expect, test } from "bun:test";
import { state } from "@/lib/gradebook/history-fixture";
import { assignmentPage, requireClassId } from "./gradebook-details";

test("assignment filters are inclusive and pagination stays deterministic", () => {
  const report = state();
  const { assignments } = report.classes.chemistry;
  assignments.a1.description = "Teacher's instructions";
  assignments.a2 = {
    ...assignments.a1,
    name: "Missing Test",
    earned: null,
    status: "missing",
  };
  assignments.a3 = {
    ...assignments.a1,
    name: "Later Test",
    status: "excuse",
    dueDate: "2026-10-05T00:00:00Z",
  };

  const filters = {
    classId: " chemistry ",
    dueFrom: "2026-09-04",
    dueThrough: "2026-09-04",
    limit: 1,
  };
  const first = assignmentPage(report, filters);
  expect(first.total).toBe(2);
  expect(first.assignments.map((row) => row.assignmentId)).toEqual(["a1"]);
  expect(first.assignments[0].percentage).toBe(0.88);
  expect(first.assignments[0]).not.toHaveProperty("description");
  const second = assignmentPage(report, {
    ...filters,
    offset: first.nextOffset ?? 0,
    includeDetails: true,
  });
  expect(second.nextOffset).toBeNull();
  expect(second.assignments).toMatchObject([
    {
      assignmentId: "a2",
      status: "missing",
      percentage: 0,
      description: "Teacher's instructions",
    },
  ]);
  expect(
    assignmentPage(report, { status: "excused" }).assignments,
  ).toMatchObject([{ assignmentId: "a3", percentage: null }]);
});

test("duplicate course titles require a canonical ID", () => {
  const report = state();
  report.classes.chemistry2 = {
    ...report.classes.chemistry,
    name: "Chemistry - 2",
  };
  expect(() => requireClassId(report, "CHEMISTRY")).toThrow("AMBIGUOUS_CLASS");
  expect(requireClassId(report, "chemistry")).toBe("chemistry");
  expect(requireClassId(report, "Chemistry - 2")).toBe("chemistry2");
});
