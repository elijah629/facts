import { expect, test } from "bun:test";
import {
  formatGrade,
  formatGradeChange,
  percentagePointChange,
} from "./display";
import { gradeTrend } from "./trend";

test("grades and grade changes keep their units and sign", () => {
  expect(formatGrade(0.98)).toBe("98%");
  expect(formatGradeChange(percentagePointChange(0.98, 0.95))).toBe("+3%");
  expect(formatGradeChange(percentagePointChange(0.8, 0.82))).toBe("-2%");
  expect(formatGradeChange(percentagePointChange(0.98001, 0.98))).toBeNull();
  expect(formatGradeChange(percentagePointChange(null, 0.82))).toBeNull();
  expect(formatGradeChange(-0.125, "gpa")).toBe("-0.125");
});

test("trend colors use direction and break when the term changes or grades are missing", () => {
  const points = [0.95, 0.98, 0.96, null, 0.9, 0.92, 0.5];
  const result = gradeTrend(
    points.map((value, sequence) => ({
      value,
      sequence,
      period: sequence === 6 ? "Q2" : "Q1",
    })),
    "percent",
  );
  expect(result.lines).toHaveLength(2);
  expect(
    result.lines[0].stops
      .filter((stop) => stop.edge === "start")
      .map((stop) => stop.color),
  ).toEqual([
    "var(--grade-up)",
    "var(--grade-down)",
    "var(--muted-foreground)",
    "var(--muted-foreground)",
    "var(--grade-up)",
  ]);
  expect(result.lines[1].stops).toEqual([]);
  expect(result.data[3].series_0).toBeNull();
});

test("GPA draws a single series across terms and skips missing values", () => {
  const trend = gradeTrend(
    [
      { sequence: 3, period: "Q1", value: 3.8 },
      { sequence: 4, period: "Q2", value: null },
      { sequence: 5, period: "Q2", value: 3.9 },
      { sequence: 6, period: "Q3", value: 3.7 },
    ],
    "gpa",
  );
  expect(trend.lines).toHaveLength(1);
  expect(trend.data[1].series_3).toBeNull();
  expect(trend.lines[0].stops).toEqual([
    { offset: 0, color: "var(--grade-up)", edge: "start" },
    { offset: 2 / 3, color: "var(--grade-up)", edge: "end" },
    { offset: 2 / 3, color: "var(--grade-down)", edge: "start" },
    { offset: 1, color: "var(--grade-down)", edge: "end" },
  ]);
});
