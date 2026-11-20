import { describe, expect, test } from "bun:test";
import { classifyCourse, matchCourse, observedCourses } from "./courses";
import { type AdmissionRow, admissionsGpas } from "./gpa";

function entry(
  code: string,
  changes: Partial<AdmissionRow> = {},
): AdmissionRow {
  const course = observedCourses.find((row) => row.code === code);
  if (!course) throw new Error("Test course missing");
  return {
    ...course,
    id: code,
    year: 2026,
    gradeLevel: 10,
    semester: 1,
    mark: "A",
    progress: false,
    ...changes,
  };
}

describe("Garces A–G course matches", () => {
  test("every observed class has a catalog record or an explicit review reason", () => {
    expect(observedCourses).toHaveLength(29);
    expect(new Set(observedCourses.map((row) => row.code)).size).toBe(29);
    for (const row of observedCourses) {
      const match = matchCourse(`${row.code} - 7`, row.name);
      const info = classifyCourse(match, 2026);
      expect(match).toEqual(row);
      expect(Boolean(info.approval || info.note)).toBe(true);
    }
  });

  test("school honors labels are independent of UC and CSU bonus credit", () => {
    for (const code of ["MATH 202", "MATH 302", "SPAN 202"]) {
      const result = classifyCourse(entry(code), 2026);
      expect(result.level).toBe("Honors");
      expect(result.approval?.honors).toBe(false);
    }
    for (const code of [
      "ENG 202",
      "SCI 302",
      "SPAN 302",
      "MATH 151",
      "MATH 161",
    ]) {
      const result = classifyCourse(entry(code), 2026);
      expect(result.level).toBe("Honors");
      expect(result.approval?.honors).toBe(true);
    }
    expect(classifyCourse(entry("ENG 309"), 2026).level).toBe("AP");
    expect(classifyCourse(entry("ARTV 105"), 2026).approval?.area).toBe("F");
    expect(classifyCourse(entry("THEO 201A"), 2026).approval?.area).toBe("G");
    expect(classifyCourse(entry("AG 172"), 2026).approval).toBeUndefined();
  });
});

describe("college GPA estimates", () => {
  test("distinguishes UC and CSU grade-10 caps, grade-12 grades and UF/ASU honors weighting", () => {
    const scores = admissionsGpas([
      entry("ENG 202"),
      entry("ENG 202", { semester: 2 }),
      entry("SCI 302"),
      entry("SCI 302", { semester: 2 }),
      entry("MATH 302"),
      entry("ENG 309", { gradeLevel: 11, mark: "D" }),
      entry("SPAN 302", { gradeLevel: 12 }),
      entry("PE 301B"),
    ]);
    expect(scores.uc.bonus).toBe(4);
    expect(scores.ucNonresident.bonus).toBe(0);
    expect(scores.csu.bonus).toBe(2);
    expect(scores.csuAll.bonus).toBe(3);
    expect(scores.uc.semesters).toBe(6);
    expect(scores.csuAll.semesters).toBe(7);
    expect(scores.asu.bonus).toBe(0);
    expect(scores.uf.bonus).toBe(4);
    expect(scores.counts.B).toBe(2);
  });

  test("excludes progress by default, prioritizes official grades and respects half-year courses", () => {
    const scores = admissionsGpas(
      [
        entry("ENG 202", { progress: true }),
        entry("ENG 202", { mark: "C" }),
        entry("SCI 302", { progress: true }),
        entry("THEO 201A"),
        entry("THEO 201A", { semester: 2 }),
      ],
      true,
    );
    expect(scores.uc.semesters).toBe(3);
    expect(scores.ucUnweighted.value).toBeCloseTo(10 / 3);
    expect(scores.counts.G).toBe(1);
    expect(
      admissionsGpas([entry("SCI 302", { progress: true })]).uc.value,
    ).toBeNull();
  });

  test("caps UC and CSU at eight bonuses and omits ASU courses deselected by students", () => {
    const scores = admissionsGpas(
      ["ENG 309", "SCI 302", "SPAN 302", "SS 109", "MATH 151"].flatMap((code) =>
        ([1, 2] as const).map((semester) =>
          entry(code, {
            gradeLevel: 11,
            semester,
            asuExcluded: code === "SCI 302",
          }),
        ),
      ),
    );
    expect(scores.uc.bonus).toBe(8);
    expect(scores.csu.bonus).toBe(8);
    expect(scores.asu.semesters).toBe(6);
  });
});
