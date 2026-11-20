import { expect, test } from "bun:test";
import { formatGradeChange } from "../grades/display";
import { compareReportGrades } from "./changes";
import { state } from "./history-fixture";
import { reportProjection } from "./projection";

test("dashboard comparisons use prior marks in the same academic term", () => {
  const earlier = state();
  const latest = structuredClone(earlier);
  latest.classes.chemistry.assignments.a1.earned = "45.5";
  const oldReport = reportProjection(earlier);
  const newReport = reportProjection(latest);
  const grade = compareReportGrades(newReport, oldReport);
  expect(formatGradeChange(grade.classChanges.Chemistry)).toBe("+3%");
  expect(compareReportGrades({ ...newReport, term: "2" }, oldReport)).toEqual({
    classChanges: {},
  });
  expect(compareReportGrades(newReport, null)).toEqual({ classChanges: {} });
});

test("dashboard change feed skips metadata and gives updated scores plain labels", async () => {
  const { gradebookChanges } = await import("./changes");
  const { diffGradebooks } = await import("./diff");
  const earlier = state();
  const latest = structuredClone(earlier);
  latest.classes.chemistry.teacher = "New teacher";
  latest.classes.chemistry.grading.roundingPrecision = 3;
  expect(
    gradebookChanges(
      latest,
      diffGradebooks(earlier, latest),
      reportProjection(latest),
      earlier,
    ),
  ).toEqual([]);
  latest.classes.chemistry.assignments.a1.earned = "46";
  const changes = gradebookChanges(
    latest,
    diffGradebooks(earlier, latest),
    reportProjection(latest),
    earlier,
  );
  expect(changes[0].entries[0].text).toBe("Test 1: 44/50 to 46/50");
  expect(changes[0].entries[0].change).toBeCloseTo(4);
});
