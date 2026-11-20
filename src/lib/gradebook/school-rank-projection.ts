import { schoolGpas } from "@/lib/grades";
import { assertFactsProgressReportUrl } from "@/lib/report/urls";
import { gradeRankStudentKey } from "@/lib/security/source-encryption";
import type { Report } from "@/types/report";

export const SCHOOL_RANK_MINIMUM = 10;
export const SCHOOL_RANK_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const noRank = {
  rankCohort: null,
  rankStudentKey: null,
  rankGpa: null,
};

export function schoolRankProjection(report: Report, sourceUrl: string | null) {
  if (!sourceUrl) return noRank;
  const url = assertFactsProgressReportUrl(sourceUrl);
  const districts = [...url.searchParams]
    .filter(([name]) => name.toLowerCase() === "district")
    .map(([, value]) => value.trim().toLowerCase());
  const district = districts[0];
  const term = report.term.trim().toLowerCase();
  const name = report.for
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  const gpa = schoolGpas(report.classes).unweighted;
  if (
    districts.length !== 1 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(district) ||
    url.hostname !== `${district}.client.factsmgt.com` ||
    !term ||
    !name ||
    gpa === null
  )
    return noRank;

  const cohort = JSON.stringify([
    district,
    report.yearRange.min,
    report.yearRange.max,
    term,
  ]);
  return {
    rankCohort: cohort,
    rankStudentKey: gradeRankStudentKey(cohort, name),
    rankGpa: Math.round(gpa * 1000),
  };
}
