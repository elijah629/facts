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
