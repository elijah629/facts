import { createHash } from "node:crypto";
import { compareClassesByPeriod } from "@/lib/report/class-order";
import type { Assignment, Report } from "@/types/report";
import type {
  CanonicalAssignment,
  CanonicalClass,
  DecimalValue,
  GradebookState,
} from "./types";

function normalize(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function slug(value: string): string {
  return (
    normalize(value)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "") || "item"
  );
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function decimal(value: number | undefined): DecimalValue | null {
  if (value === undefined || !Number.isFinite(value)) return null;
  return String(value);
}

function assignmentFields(
  assignment: Assignment,
  categoryId: string,
): CanonicalAssignment {
  return {
    name: normalize(assignment.name),
    description: assignment.description
      ? normalize(assignment.description)
      : null,
    categoryId,
    earned: assignment.status === "valid" ? decimal(assignment.points) : null,
    possible:
      assignment.status === "valid" || assignment.status === "missing"
        ? decimal(assignment.maxPoints)
        : null,
    status: assignment.status,
    excluded: assignment.status === "excuse",
    extraCredit:
      (assignment.status === "valid" && assignment.maxPoints === 0) ||
      (assignment.bonus ?? 0) > 0,
    dueDate: assignment.due.toISOString(),
    note: assignment.note ? normalize(assignment.note) : null,
    weight: decimal(assignment.weight),
    curve: decimal(assignment.curve),
    bonus: decimal(assignment.bonus),
    penalty: decimal(assignment.penalty),
  };
}

function assignmentFingerprint(
  classId: string,
  assignment: CanonicalAssignment,
): string {
  return [
    classId,
    normalize(assignment.name).toLowerCase(),
    assignment.dueDate,
    assignment.categoryId,
    assignment.possible ?? "",
  ].join("\u001f");
}

function reconcileAssignmentId(
  classId: string,
  next: CanonicalAssignment,
  previous: CanonicalClass | undefined,
  claimed: Set<string>,
): string {
  if (previous) {
    const exact = Object.entries(previous.assignments).filter(
      ([id, item]) =>
        !claimed.has(id) &&
        item.dueDate === next.dueDate &&
        item.name.localeCompare(next.name, undefined, {
          sensitivity: "base",
        }) === 0,
    );
    if (exact.length === 1) return exact[0][0];

    const semantic = Object.entries(previous.assignments).filter(
      ([id, item]) =>
        !claimed.has(id) &&
        item.dueDate === next.dueDate &&
        item.categoryId === next.categoryId &&
        item.possible === next.possible,
    );
    if (semantic.length === 1) return semantic[0][0];
  }

  const base = `${slug(next.name)}-${digest(assignmentFingerprint(classId, next))}`;
  let id = base;
  let collision = 2;
  while (claimed.has(id)) id = `${base}-${collision++}`;
  return id;
}

export function canonicalizeReport(
  report: Report,
  previous?: GradebookState,
): GradebookState {
  const classes: Record<string, CanonicalClass> = {};

  for (const cls of report.classes) {
    const classId = `${slug(cls.fullName)}-${digest(
      `${report.term}\u001f${report.yearRange.min}\u001f${cls.fullName}`,
    )}`;
    const previousClass = previous?.classes[classId];
    const categories: CanonicalClass["grading"]["categories"] = {};
    const assignments: CanonicalClass["assignments"] = {};
    const claimed = new Set<string>();

    for (const section of cls.sections) {
      const categoryId = `${slug(section.name)}-${digest(
        `${classId}\u001f${section.name}\u001f${section.description ?? ""}`,
      )}`;
      categories[categoryId] = {
        name: normalize(section.name),
        description: section.description
          ? normalize(section.description)
          : null,
        weight: decimal(section.weight),
      };

      for (const assignment of section.assignments) {
        const item = assignmentFields(assignment, categoryId);
        const assignmentId = reconcileAssignmentId(
          classId,
          item,
          previousClass,
          claimed,
        );
        claimed.add(assignmentId);
        assignments[assignmentId] = item;
      }
    }

    classes[classId] = {
      name: normalize(cls.fullName),
      displayName: normalize(cls.displayName),
      teacher: normalize(cls.instructor),
      term: normalize(report.term),
      grading: {
        mode: cls.gradingMethod,
        roundingPrecision: cls.roundingPrecision,
        categories,
      },
      assignments,
    };
  }

  return {
    studentName: normalize(report.for),
    term: normalize(report.term),
    yearRange: report.yearRange,
    classes,
  };
}

export function reportFromCanonical(state: GradebookState): Report {
  return {
    for: state.studentName,
    term: state.term,
    yearRange: state.yearRange,
    classes: Object.values(state.classes)
      .sort(compareClassesByPeriod)
      .map((cls) => ({
        fullName: cls.name,
        displayName: cls.displayName,
        instructor: cls.teacher,
        gradingMethod: cls.grading.mode,
        roundingPrecision: cls.grading.roundingPrecision,
        sections: Object.entries(cls.grading.categories)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([categoryId, category]) => ({
            name: category.name,
            description: category.description ?? undefined,
            weight:
              category.weight === null ? undefined : Number(category.weight),
            assignments: Object.entries(cls.assignments)
              .filter(([, assignment]) => assignment.categoryId === categoryId)
              .sort(
                ([, left], [, right]) =>
                  left.dueDate.localeCompare(right.dueDate) ||
                  left.name.localeCompare(right.name),
              )
              .map(([, assignment], sourceIndex): Assignment => {
                const common = {
                  sourceIndex,
                  name: assignment.name,
                  description: assignment.description ?? undefined,
                  due: new Date(assignment.dueDate),
                  note: assignment.note ?? undefined,
                  weight:
                    assignment.weight === null
                      ? undefined
                      : Number(assignment.weight),
                  curve:
                    assignment.curve === null
                      ? undefined
                      : Number(assignment.curve),
                  bonus:
                    assignment.bonus === null
                      ? undefined
                      : Number(assignment.bonus),
                  penalty:
                    assignment.penalty === null
                      ? undefined
                      : Number(assignment.penalty),
                };
                if (assignment.status === "valid") {
                  return {
                    ...common,
                    status: "valid",
                    points: Number(assignment.earned ?? 0),
                    maxPoints: Number(assignment.possible ?? 0),
                  };
                }
                if (assignment.status === "missing") {
                  return {
                    ...common,
                    status: "missing",
                    maxPoints: Number(assignment.possible ?? 0),
                  };
                }
                return { ...common, status: "excuse" };
              }),
          })),
      })),
  };
}
