"use client";

import {
  ArrowUpRight,
  BookOpenCheck,
  GraduationCap,
  ListFilter,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type Area,
  academicYears,
  agRequirements,
  catalogOptions,
  classifyCourse,
  matchCourse,
  observedCourses,
} from "@/lib/admissions/courses";
import { type AdmissionRow, admissionsGpas, marks } from "@/lib/admissions/gpa";
import { classGrade, GPA_WEIGHTS, letterGrade, schoolGpas } from "@/lib/grades";
import { useReport } from "@/lib/report/store";

const mobileRow = "grid grid-cols-2 gap-2 py-3 lg:table-row lg:py-0";
const mobileField =
  "min-w-0 whitespace-normal before:mb-1 before:block before:text-xs before:text-muted-foreground before:content-[attr(data-label)] lg:before:hidden";

const catalogLink =
  "https://hs-articulation.ucop.edu/agcourselist/institution/2845";
const systems = [
  {
    key: "uc",
    title: "University of California",
    label: "Capped weighted · grades 10–11",
    href: "https://admission.universityofcalifornia.edu/admission-requirements/first-year-requirements/gpa-requirement.html",
  },
  {
    key: "csu",
    title: "California State University",
    label: "Application estimate · grades 10–11",
    href: "https://www.calstate.edu/apply/freshman/Documents/cal-state-apply-freshman-application-guide.pdf",
  },
  {
    key: "asu",
    title: "Arizona State University",
    label: "Unweighted · selected competency courses",
    href: "https://admission.asu.edu/apply/first-year/admission",
  },
  {
    key: "uf",
    title: "University of Florida",
    label: "Weighted academic core · grades 9–12",
    href: "https://admissions.ufl.edu/apply/freshman/our-decision-process",
  },
] as const;

const selectStyle =
  "h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";
const formatYear = (year: number) => `${year}–${String(year + 1).slice(-2)}`;
const score = (value: number | null, truncate = false) =>
  value === null
    ? "—"
    : (truncate ? Math.floor(value * 100 + 1e-9) / 100 : value).toFixed(2);

export function CollegePlanner() {
  const report = useReport((state) => state.report);
  const loading = useReport((state) => state.loading);
  const authenticated = useReport((state) => state.authenticated);
  const [rows, setRows] = useState<AdmissionRow[]>([]);
  const [year, setYear] = useState<number>(academicYears[0]);
  const [catalogYear, setCatalogYear] = useState<number>(academicYears[0]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [level, setLevel] = useState<AdmissionRow["gradeLevel"]>(0);
  const [semester, setSemester] = useState<AdmissionRow["semester"]>(1);
  const [includeProgress, setIncludeProgress] = useState(false);
  const [nonresident, setNonresident] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const result = admissionsGpas(rows, includeProgress);
  const school = schoolGpas(report?.classes ?? []);
  const courses =
    report?.classes.map((cls) => matchCourse(cls.fullName, cls.displayName)) ??
    [];
  const progressIncluded =
    includeProgress &&
    rows.some((row) => row.progress && row.mark && row.gradeLevel);
  const matches = observedCourses.filter((row) => {
    const entry = classifyCourse(row, catalogYear);
    return (
      `${row.name} ${row.code}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (filter === "all" ||
        (filter === "honors"
          ? entry.level === "Honors" || entry.level === "AP"
          : entry.approval?.area === filter))
    );
  });
  const blankRow = {
    year,
    gradeLevel: level,
    semester,
    mark: "" as const,
    progress: false,
  };

  function changeRow(id: string, change: Partial<AdmissionRow>) {
    setRows((existing) =>
      existing.map((row) => (row.id === id ? { ...row, ...change } : row)),
    );
  }

  function appendCourse() {
    const course = catalogOptions.find(
      (option) => option.record === selectedCourse,
    );
    if (course)
      setRows((existing) => [
        ...existing,
        {
          ...blankRow,
          ...course,
          id: crypto.randomUUID(),
          code: course.record,
        },
      ]);
  }

  function importReport() {
    if (!report || !level) return;
    const imports = report.classes.map((cls): AdmissionRow => {
      const mapped = matchCourse(cls.fullName, cls.displayName);
      const percent = classGrade(cls);
      const letter = Number.isFinite(percent) ? letterGrade(percent)[0] : "";
      const mark = marks.find((value) => value === letter) ?? "";
      return {
        ...blankRow,
        ...mapped,
        year: report.yearRange.min,
        id: crypto.randomUUID(),
        mark,
        progress: true,
      };
    });
    setRows((existing) => [
      ...existing,
      ...imports.filter(
        (row) =>
          !existing.some(
            (saved) =>
              (saved.record ?? saved.code) === (row.record ?? row.code) &&
              saved.year === row.year &&
              saved.semester === row.semester,
          ),
      ),
    ]);
    setIncludeProgress(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-8">
      <header className="space-y-3 border-b pb-6">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <GraduationCap className="size-5" /> College planning
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
          GPA &amp; A–G
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Compare your current school GPA with college admissions estimates. Use
          transcript grades or preview your current FACTS marks.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm">
            <a href="#transcript">Enter semester grades</a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href="#course-matches">Browse course matches</a>
          </Button>
        </div>
      </header>

      <section aria-label="GPA comparison" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">GPA comparison</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={nonresident}
              onChange={(e) => setNonresident(e.target.checked)}
            />{" "}
            UC nonresident calculation
          </label>
        </div>
        {progressIncluded && (
          <p
            role="status"
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm"
          >
            Includes FACTS progress grades projected as semester grades.
          </p>
        )}
        <div className="divide-y rounded-xl border">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
            <div>
              <h3 className="font-semibold">Garces school GPA</h3>
              <p className="text-xs text-muted-foreground">
                Current FACTS grades · school scale
              </p>
            </div>
            <p className="text-2xl font-semibold tabular-nums">
              {score(school.weighted)}
            </p>
            <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:col-span-1 sm:justify-self-end">
              <span>Unweighted {score(school.unweighted)}</span>
              <a
                className="text-xs underline underline-offset-4"
                href="#school-scale"
              >
                School scale
              </a>
            </div>
          </div>
          {systems.map((system) => {
            const grade =
              system.key === "uc" && nonresident
                ? result.ucNonresident
                : result[system.key];
            return (
              <div
                key={system.key}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center"
              >
                <div>
                  <h3 className="font-semibold">{system.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {system.label}
                  </p>
                </div>
                <p className="text-2xl font-semibold tabular-nums">
                  {score(grade.value, system.key === "uc")}
                </p>
                <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:col-span-1 sm:justify-self-end">
                  <span>
                    {grade.semesters} grades
                    {grade.bonus ? ` · +${grade.bonus} bonus points` : ""}
                  </span>
                  {system.key === "uc" && (
                    <span>
                      Unweighted {score(result.ucUnweighted.value, true)}
                    </span>
                  )}
                  {system.key === "csu" && (
                    <span>Through grade 12 {score(result.csuAll.value)}</span>
                  )}
                  <a
                    className="inline-flex items-center gap-1 underline underline-offset-4"
                    href={system.href}
                  >
                    Official rules <ArrowUpRight className="size-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
        <details
          id="school-scale"
          className="scroll-mt-4 rounded-lg border px-4 py-3"
        >
          <summary className="cursor-pointer text-sm font-medium">
            School letter-grade scale
          </summary>
          <div className="mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead>Standard</TableHead>
                  <TableHead>AP / Honors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(GPA_WEIGHTS.regular).map(
                  ([grade, standard]) => (
                    <TableRow key={grade}>
                      <TableCell>{grade}</TableCell>
                      <TableCell>{standard.toFixed(1)}</TableCell>
                      <TableCell>
                        {GPA_WEIGHTS.weighted[
                          grade as keyof typeof GPA_WEIGHTS.weighted
                        ].toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
        </details>
      </section>

      <Card id="transcript" className="scroll-mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <BookOpenCheck className="size-5" /> Semester grades
          </CardTitle>
          <CardDescription>
            Use one row per semester and omit superseded attempts under the
            college’s repeat rules. Use the base letter grade for these
            estimates. Duplicate course/term entries and grades beyond the
            listed course length count once. Entries last until you reload.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 rounded-lg border bg-muted/35 p-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="college-year">School year</Label>
              <select
                id="college-year"
                className={selectStyle}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {academicYears.map((value) => (
                  <option value={value} key={value}>
                    {formatYear(value)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="college-level">Grade level</Label>
              <select
                id="college-level"
                className={selectStyle}
                value={level}
                onChange={(e) =>
                  setLevel(Number(e.target.value) as AdmissionRow["gradeLevel"])
                }
              >
                <option value={0}>Select grade</option>
                {[9, 10, 11, 12].map((grade) => (
                  <option key={grade} value={grade}>
                    Grade {grade}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="college-term">Term</Label>
              <select
                id="college-term"
                className={selectStyle}
                value={semester}
                onChange={(e) =>
                  setSemester(
                    Number(e.target.value) as AdmissionRow["semester"],
                  )
                }
              >
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
                <option value={3}>Summer</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-full min-w-0 flex-1 sm:min-w-55 space-y-1.5">
              <Label htmlFor="college-add-course">Approved Garces course</Label>
              <select
                id="college-add-course"
                className={selectStyle}
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="">Select course</option>
                {catalogOptions
                  .filter(
                    (course) =>
                      classifyCourse({ ...course, code: course.record }, year)
                        .approval,
                  )
                  .map((course) => (
                    <option key={course.record} value={course.record}>
                      {course.name}
                    </option>
                  ))}
              </select>
            </div>
            <Button
              variant="outline"
              disabled={
                !selectedCourse ||
                !level ||
                !classifyCourse(
                  { code: selectedCourse, record: selectedCourse, name: "" },
                  year,
                ).approval
              }
              onClick={appendCourse}
            >
              <Plus /> Add semester
            </Button>
            <Button
              variant="secondary"
              disabled={!report || !level}
              onClick={importReport}
            >
              Preview current FACTS grades
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {report
              ? `FACTS ${report.term} grades load as projections for ${formatYear(report.yearRange.min)}. Select your current grade level and target semester first.`
              : loading
                ? "Loading the current report…"
                : authenticated
                  ? "No current FACTS report is available. You can enter grades manually."
                  : "Sign in to preview your FACTS grades. You can enter grades manually."}
            {
              " For UC summer grades, assign the summer after 9th or 10th to grade 10 and the summer after 11th to grade 11."
            }
          </p>
          {rows.length > 0 && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeProgress}
                  onChange={(e) => setIncludeProgress(e.target.checked)}
                />{" "}
                Include projected progress grades in GPA
              </label>
              <Table className="grid lg:table">
                <TableHeader className="sr-only lg:not-sr-only">
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Grade level</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Letter grade</TableHead>
                    <TableHead>Grade source</TableHead>
                    <TableHead>ASU</TableHead>
                    <TableHead>Remove</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="block lg:table-row-group">
                  {rows.map((row) => {
                    const entry = classifyCourse(row, row.year);
                    return (
                      <TableRow key={row.id} className={mobileRow}>
                        <TableCell className="col-span-2 min-w-0 max-w-65 whitespace-normal">
                          <div className="font-medium">{row.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatYear(row.year)} ·{" "}
                            {entry.approval
                              ? `Area ${entry.approval.area}`
                              : "Review"}
                            {entry.level !== "Standard" && ` · ${entry.level}`}
                          </div>
                        </TableCell>
                        <TableCell
                          className={mobileField}
                          data-label="Grade level"
                        >
                          <select
                            className={selectStyle}
                            value={row.gradeLevel}
                            aria-label={`Grade level for ${row.name}`}
                            onChange={(e) =>
                              changeRow(row.id, {
                                gradeLevel: Number(
                                  e.target.value,
                                ) as AdmissionRow["gradeLevel"],
                              })
                            }
                          >
                            {[9, 10, 11, 12].map((grade) => (
                              <option value={grade} key={grade}>
                                {grade}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell
                          className={mobileField}
                          data-label="Semester"
                        >
                          <select
                            className={selectStyle}
                            value={row.semester}
                            aria-label={`Semester for ${row.name}`}
                            onChange={(e) =>
                              changeRow(row.id, {
                                semester: Number(
                                  e.target.value,
                                ) as AdmissionRow["semester"],
                              })
                            }
                          >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>Summer</option>
                          </select>
                        </TableCell>
                        <TableCell
                          className={mobileField}
                          data-label="Letter grade"
                        >
                          <select
                            className={selectStyle}
                            value={row.mark}
                            aria-label={`Letter grade for ${row.name}`}
                            onChange={(e) =>
                              changeRow(row.id, {
                                mark: e.target.value as AdmissionRow["mark"],
                              })
                            }
                          >
                            <option value="">—</option>
                            {marks.map((mark) => (
                              <option value={mark} key={mark}>
                                {mark}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell
                          className={mobileField}
                          data-label="Grade source"
                        >
                          <select
                            className={selectStyle}
                            value={row.progress ? "progress" : "transcript"}
                            aria-label={`Grade source for ${row.name}`}
                            onChange={(e) =>
                              changeRow(row.id, {
                                progress: e.target.value === "progress",
                              })
                            }
                          >
                            <option value="transcript">Transcript</option>
                            <option value="progress">Progress</option>
                          </select>
                        </TableCell>
                        <TableCell
                          className={mobileField}
                          data-label="Use in ASU GPA"
                        >
                          {entry.asu ? (
                            <input
                              type="checkbox"
                              aria-label={`Use ${row.name} for ASU GPA`}
                              checked={!row.asuExcluded}
                              onChange={(e) =>
                                changeRow(row.id, {
                                  asuExcluded: !e.target.checked,
                                })
                              }
                            />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className={mobileField} data-label="Remove">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove ${row.name}`}
                            onClick={() =>
                              setRows((existing) =>
                                existing.filter((item) => item.id !== row.id),
                              )
                            }
                          >
                            <Trash2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground">
                For ASU, select the courses used for each competency. Review
                U.S. history, distinct lab sciences and the same second language
                against{" "}
                <a
                  className="underline"
                  href="https://admission.asu.edu/apply/first-year/competency-requirements"
                >
                  ASU’s detailed requirements
                </a>
                .
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">A–G subject requirements</CardTitle>
          <CardDescription>
            UC and CSU each require 15 yearlong courses. UC expects 11 before
            12th grade. Counts below show entered transcript semesters with C or
            better. Check sequences, approved substitutions and how excess A–F
            credit can satisfy G.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(agRequirements) as Area[]).map((area) => {
            const requirement = agRequirements[area];
            return (
              <div
                key={area}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <Badge variant="secondary">{area}</Badge>
                <div className="flex-1">
                  <div className="font-medium">{requirement.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {requirement.detail}
                  </div>
                </div>
                <span
                  title="Entered / required semesters"
                  className="text-sm tabular-nums"
                >
                  {result.counts[area] ?? 0} / {requirement.semesters}
                </span>
              </div>
            );
          })}
          <a
            className="mt-1 text-sm underline"
            href="https://admission.universityofcalifornia.edu/admission-requirements/first-year-requirements/subject-requirement-a-g.html"
          >
            UC subject requirements
          </a>
          <a
            className="mt-1 text-sm underline"
            href="https://www.calstate.edu/apply/freshman/getting_into_the_csu"
          >
            CSU subject requirements
          </a>
        </CardContent>
      </Card>

      {courses.length > 0 && (
        <MatchTable
          title="Your current courses"
          rows={courses}
          year={report?.yearRange.min ?? year}
        />
      )}
      <section id="course-matches" className="scroll-mt-4 space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-full min-w-0 flex-1 sm:min-w-45 space-y-1.5">
            <Label htmlFor="college-course-search">
              <ListFilter className="size-4" /> Search course matches
            </Label>
            <Input
              id="college-course-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by course or code"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="college-course-filter">Show</Label>
            <select
              id="college-course-filter"
              className={selectStyle}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All courses</option>
              <option value="honors">Honors and AP</option>
              {Object.keys(agRequirements).map((area) => (
                <option value={area} key={area}>
                  Area {area}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="catalog-year">Catalog year</Label>
            <select
              id="catalog-year"
              className={selectStyle}
              value={catalogYear}
              onChange={(e) => setCatalogYear(Number(e.target.value))}
            >
              {academicYears.map((value) => (
                <option key={value} value={value}>
                  {formatYear(value)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <MatchTable
          title="Garces course compatibility"
          rows={matches}
          year={catalogYear}
        />
      </section>
      <p className="text-sm text-muted-foreground">
        Estimates cover matched Garces coursework. Enter official transcript
        marks and verify dual enrollment, transfer credits, repeats and
        campus-specific policies with your counselor.{" "}
        <a href={catalogLink} className="underline">
          Official Garces A–G catalog
        </a>
        .
      </p>
    </div>
  );
}

function MatchTable({
  title,
  rows,
  year,
}: {
  title: string;
  rows: ReturnType<typeof matchCourse>[];
  year: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>
          {formatYear(year)} Garces catalog. UC and CSU use the official
          listing. ASU and UF placements are subject estimates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table className="grid lg:table">
          <TableHeader className="sr-only lg:not-sr-only">
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>UC / CSU</TableHead>
              <TableHead>UC / CSU honors</TableHead>
              <TableHead>ASU competency</TableHead>
              <TableHead>UF GPA weight</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="block lg:table-row-group">
            {rows.map((row) => {
              const info = classifyCourse(row, year);
              return (
                <TableRow key={`${row.code}:${row.name}`} className={mobileRow}>
                  <TableCell className="col-span-2 min-w-0 max-w-82 whitespace-normal">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.code}
                      {info.level !== "Standard" && ` · ${info.level}`}
                    </div>
                    {info.note && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {info.note}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className={mobileField} data-label="UC / CSU">
                    {info.approval ? (
                      <Badge variant="outline">
                        {info.approval.area} ·{" "}
                        {agRequirements[info.approval.area].name}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell
                    className={mobileField}
                    data-label="UC / CSU honors"
                  >
                    {info.approval?.honors ? (
                      <Badge>+1 eligible</Badge>
                    ) : info.approval ? (
                      "No extra point"
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell
                    className={mobileField}
                    data-label="ASU competency"
                  >
                    {info.asu ?? "—"}
                  </TableCell>
                  <TableCell className={mobileField} data-label="UF GPA weight">
                    {info.ufCore || info.level === "AP"
                      ? info.level === "AP"
                        ? "+1.0"
                        : info.level === "Honors"
                          ? "+0.5"
                          : "Core · 0"
                      : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!rows.length && (
          <p className="py-4 text-sm text-muted-foreground">
            No courses match these filters.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
