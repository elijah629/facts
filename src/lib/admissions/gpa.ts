import { type Area, classifyCourse, type matchCourse } from "./courses";

export const marks = ["A", "B", "C", "D", "F"] as const;
export type Mark = (typeof marks)[number];
export type AdmissionRow = ReturnType<typeof matchCourse> & {
  id: string;
  year: number;
  gradeLevel: 0 | 9 | 10 | 11 | 12;
  semester: 1 | 2 | 3;
  mark: Mark | "";
  progress: boolean;
  asuExcluded?: boolean;
};
const points: Record<Mark, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };

export function admissionsGpas(rows: AdmissionRow[], includeProgress = false) {
  const seen = new Set<string>();
  const countsPerYear = new Map<string, number>();
  const classes = [...rows]
    .sort((a, b) => Number(a.progress) - Number(b.progress))
    .flatMap((row) => {
      if (!row.mark || !row.gradeLevel || (row.progress && !includeProgress))
        return [];
      const courseYear = [row.record ?? row.code, row.year].join(":");
      const key = `${courseYear}:${row.semester}`;
      const classification = classifyCourse(row, row.year);
      const count = countsPerYear.get(courseYear) ?? 0;
      if (
        seen.has(key) ||
        (classification.approval && count >= classification.approval.semesters)
      )
        return [];
      seen.add(key);
      countsPerYear.set(courseYear, count + 1);
      return [
        { ...row, mark: row.mark, points: points[row.mark], ...classification },
      ];
    });
  type Entry = (typeof classes)[number];

  function summarize(entries: Entry[], bonus = 0) {
    return {
      value: entries.length
        ? (entries.reduce((sum, row) => sum + row.points, 0) + bonus) /
          entries.length
        : null,
      semesters: entries.length,
      bonus,
    };
  }
  function capped(entries: Entry[], grade10Cap: number, apOnly = false) {
    const eligible = entries.filter(
      (row) =>
        row.approval?.honors &&
        row.points >= 2 &&
        (!apOnly || row.level === "AP" || /\bIB\b/i.test(row.name)),
    );
    const sophomore = eligible.filter((row) => row.gradeLevel === 10).length;
    return summarize(
      entries,
      Math.min(
        8,
        Math.min(sophomore, grade10Cap) + eligible.length - sophomore,
      ),
    );
  }

  const ag = classes.filter((row) => row.approval);
  const uc = ag.filter((row) => row.gradeLevel === 10 || row.gradeLevel === 11);
  const csu = ag.filter((row) => row.gradeLevel >= 10);
  const asu = classes.filter((row) => row.asu && !row.asuExcluded);
  const uf = classes.filter((row) => row.ufCore || row.level === "AP");
  const counts: Partial<Record<Area, number>> = {};
  for (const row of ag) {
    if (!row.progress && row.points >= 2 && row.approval) {
      const area = row.approval.area;
      counts[area] = (counts[area] ?? 0) + 1;
    }
  }
  return {
    uc: capped(uc, 4),
    ucUnweighted: summarize(uc),
    ucNonresident: capped(uc, 4, true),
    csu: capped(uc, 2),
    csuAll: capped(csu, 2),
    asu: summarize(asu),
    uf: summarize(
      uf,
      uf.reduce(
        (sum, row) =>
          sum +
          (row.level === "AP" ||
          row.level === "Dual enrollment" ||
          /\b(?:IB|AICE)\b/i.test(row.name)
            ? 1
            : row.level === "Honors"
              ? 0.5
              : 0),
        0,
      ),
    ),
    counts,
  };
}
