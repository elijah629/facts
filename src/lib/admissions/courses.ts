import { courseLevel } from "@/lib/report/course-level";
import records from "./catalog.json";

export type Area = "A" | "B" | "C" | "D" | "E" | "F" | "G";
export const agRequirements = {
  A: {
    name: "History",
    semesters: 4,
    detail: "World and U.S. history or government",
  },
  B: {
    name: "English",
    semesters: 8,
    detail: "College-preparatory composition and literature",
  },
  C: { name: "Mathematics", semesters: 6, detail: "Include geometry" },
  D: {
    name: "Science",
    semesters: 4,
    detail: "Check distinct disciplines and lab requirements",
  },
  E: {
    name: "World language",
    semesters: 4,
    detail: "Same language or equivalent proficiency",
  },
  F: {
    name: "Visual & performing arts",
    semesters: 2,
    detail: "Check the discipline and course sequence",
  },
  G: {
    name: "College-prep elective",
    semesters: 2,
    detail: "Approved elective or eligible excess A–F coursework",
  },
} satisfies Record<Area, { name: string; semesters: number; detail: string }>;

type Curriculum = {
  area: Area;
  honors: boolean;
  discipline: string;
  semesters: number;
};
type CatalogCourse = {
  title: string;
  years: Partial<Record<number, Curriculum>>;
};
const catalog: Record<string, CatalogCourse> = records as Record<
  string,
  CatalogCourse
>;

export const academicYears = [2026, 2025, 2024, 2023] as const;

type Match = { code: string; name: string; record?: string; review?: string };
export const observedCourses: Match[] = [
  { code: "SS 101", name: "World History", record: "GP8SD6" },
  { code: "SS 109", name: "AP World History", record: "AAJTYD" },
  { code: "ENG 201", name: "English 10", record: "K8AZHE" },
  { code: "ENG 202", name: "English 10 (H)", record: "T2A4BZ" },
  {
    code: "ENG 309",
    name: "English Language and Composition AP",
    record: "GCBDJ7",
  },
  { code: "MATH 101", name: "Algebra I", record: "BF3SEA" },
  { code: "MATH 201", name: "Geometry", record: "EEQY82" },
  { code: "MATH 202", name: "Geometry (H)", record: "LDZEJK" },
  { code: "MATH 301", name: "Algebra II", record: "AST97P" },
  { code: "MATH 302", name: "Algebra II (H)", record: "GLD8KN" },
  { code: "SCI 101", name: "Physics 9", record: "KCYNMG" },
  { code: "SCI 301", name: "Chemistry", record: "LQX5JD" },
  { code: "SCI 302", name: "Chemistry (H)", record: "JDACPK" },
  { code: "MATH 151", name: "Intro Engineering Design (H)", record: "TEK2FB" },
  { code: "MATH 161", name: "POE PLTW (H)", record: "KNSHRB" },
  { code: "SPAN 101", name: "Spanish I", record: "GTREZN" },
  { code: "SPAN 201", name: "Spanish II", record: "HJNLZE" },
  { code: "SPAN 202", name: "Spanish II (H)", record: "DR27EA" },
  { code: "SPAN 302", name: "Spanish III (H)", record: "DQ2KMF" },
  {
    code: "ARTP 504",
    name: "Dance Choreography/Performance",
    record: "F92L5W",
  },
  { code: "ARTV 100", name: "Art I", record: "PLTQ52" },
  { code: "ARTV 103", name: "Floral Design", record: "LN4MY3" },
  {
    code: "ARTV 105",
    name: "Agri-Design: Ag Mech & Engineering Design",
    record: "FE3GSZ",
  },
  {
    code: "SS 603",
    name: "Business Leadership, Marketing & Finance",
    record: "MW54AY",
  },
  { code: "THEO 201A", name: "Old Test.", record: "A3KASB" },
  {
    code: "AG 172",
    name: "Intro to Ag Business DE",
    review:
      "Verify the college course number, units and transferability on the college transcript.",
  },
  {
    code: "PE 301B",
    name: "PE 10-12/Fitness Boys",
    review: "Physical education is outside these admission GPA subject areas.",
  },
  {
    code: "SS 700",
    name: "Study Skills",
    review: "Study support is outside these admission GPA subject areas.",
  },
  {
    code: "THEO 405",
    name: "Campus Ministry",
    review: "No corresponding approved Garces A–G course found.",
  },
];

const observedByCode = new Map(observedCourses.map((row) => [row.code, row]));
const normalize = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, "");
const catalogByTitle = new Map(
  Object.entries(catalog).map(([id, row]) => [normalize(row.title), id]),
);
export const catalogOptions = Object.entries(catalog)
  .map(([record, course]) => ({ record, name: course.title }))
  .sort((left, right) => left.name.localeCompare(right.name));

export function matchCourse(fullName: string, name: string): Match {
  const code = fullName
    .replace(/\s+-\s+\d+$/, "")
    .trim()
    .toUpperCase();
  const observed = observedByCode.get(code);
  if (observed && normalize(observed.name) === normalize(name)) return observed;
  const record = catalogByTitle.get(normalize(name));
  return {
    code,
    name,
    record,
    review: record
      ? undefined
      : "Check the exact transcript title and course year with your counselor.",
  };
}

export type Competency =
  | "English"
  | "Math"
  | "Lab science"
  | "Social science"
  | "World language"
  | "Arts / CTE";

export function classifyCourse(row: Match, year: number) {
  const official = row.record ? catalog[row.record] : undefined;
  const approval = official?.years[year];
  const level = courseLevel(row.name);
  let asu: Competency | undefined;
  let ufCore = false;
  let note = row.review;
  if (!approval) {
    if (official)
      note = "This title is not on Garces’s UC list for the selected year.";
  } else if (approval.area === "A") {
    asu = "Social science";
    ufCore = true;
  } else if (approval.area === "B") {
    asu = "English";
    ufCore = true;
  } else if (approval.area === "C") {
    asu = "Math";
    ufCore = true;
  } else if (approval.area === "D") {
    if (
      [
        "Physics",
        "Chemistry",
        "Biology / Life Sciences",
        "Earth and Space Sciences",
      ].includes(approval.discipline)
    ) {
      asu = "Lab science";
      ufCore = true;
    } else {
      note =
        "Confirm ASU and UF placement. Engineering can count as additional UC science, beyond the two core science areas.";
    }
  } else if (approval.area === "E") {
    asu = "World language";
    ufCore = true;
  } else if (approval.area === "F") {
    asu = "Arts / CTE";
  } else if (/economics|psychology/i.test(official?.title ?? "")) {
    asu = "Social science";
    ufCore = true;
  } else if (row.code === "THEO 201A") {
    note =
      "UC and CSU list this as G. Confirm any social-science credit separately with ASU or UF.";
  }
  return { approval, level, officialTitle: official?.title, asu, ufCore, note };
}
