import { classGrade, schoolGpas } from "@/lib/grades";
import { percentagePointChange } from "@/lib/grades/display";
import type { Report } from "@/types/report";
import { assignmentHeadline } from "./history-changes";
import type {
  CanonicalAssignment,
  GradebookDelta,
  GradebookState,
} from "./types";

export interface GradebookChange {
  id: string;
  classIndex: number | null;
  title: string;
  entries: { id: string; text: string; change?: number }[];
}

export function gradebookChanges(
  state: GradebookState,
  delta: GradebookDelta | null,
  report: Report,
  baseline?: GradebookState | null,
): GradebookChange[] {
  if (!delta) return [];
  const indices = new Map(
    report.classes.map((cls, index) => [cls.fullName, index]),
  );
  const changes: GradebookChange[] = [];
  if (delta.set?.term || delta.set?.yearRange) {
    changes.push({
      id: "term",
      classIndex: null,
      title: "Gradebook",
      entries: [{ id: "term", text: "A new term or school year began" }],
    });
  }
  for (const [id, cls] of Object.entries(delta.classesAdded ?? {})) {
    changes.push({
      id,
      classIndex: indices.get(cls.name) ?? null,
      title: cls.displayName,
      entries: [{ id: "added", text: "Class added" }],
    });
  }
  if (delta.classesRemoved?.length) {
    changes.push({
      id: "removed",
      classIndex: null,
      title: "Gradebook",
      entries: [
        {
          id: "removed",
          text: `${delta.classesRemoved.length} classes removed`,
        },
      ],
    });
  }
  for (const [id, change] of Object.entries(delta.classesChanged ?? {})) {
    const cls = state.classes[id];
    if (!cls) continue;
    const entries: GradebookChange["entries"] = [];
    for (const [assignmentId, assignment] of Object.entries(
      change.assignments?.added ?? {},
    )) {
      entries.push({
        id: assignmentId,
        text: assignmentHeadline(assignment) ?? `${assignment.name} was added`,
      });
    }
    for (const [assignmentId, fields] of Object.entries(
      change.assignments?.changed ?? {},
    )) {
      const assignment = cls.assignments[assignmentId];
      if (!assignment) continue;
      const previous = baseline?.classes[id]?.assignments[assignmentId];
      const text = previous
        ? assignmentHeadline(assignment, previous)
        : "earned" in fields || "possible" in fields || "status" in fields
          ? assignmentHeadline(assignment)
          : undefined;
      if (text)
        entries.push({
          id: assignmentId,
          text,
          change: assignmentScoreChange(assignment, previous),
        });
    }
    if (change.assignments?.removed?.length)
      entries.push({
        id: "removed",
        text: `${change.assignments.removed.length} assignments removed`,
      });
    if (entries.length)
      changes.push({
        id,
        classIndex: indices.get(cls.name) ?? null,
        title: cls.displayName,
        entries,
      });
  }
  return changes;
}

function assignmentScoreChange(
  current: CanonicalAssignment,
  previous: CanonicalAssignment | undefined,
) {
  if (
    current.status !== "valid" ||
    previous?.status !== "valid" ||
    current.earned === null ||
    previous.earned === null ||
    Number(current.possible) <= 0 ||
    Number(previous.possible) <= 0
  )
    return undefined;
  return percentagePointChange(
    Number(current.earned) / Number(current.possible),
    Number(previous.earned) / Number(previous.possible),
  );
}

export function compareReportGrades(current: Report, previous: Report | null) {
  const classChanges: Record<string, number> = {};
  if (
    !previous ||
    previous.term !== current.term ||
    previous.yearRange.min !== current.yearRange.min ||
    previous.yearRange.max !== current.yearRange.max
  )
    return { classChanges };
  const old = new Map(
    previous.classes.map((course) => [course.fullName, classGrade(course)]),
  );
  for (const course of current.classes) {
    const change = percentagePointChange(
      classGrade(course),
      old.get(course.fullName),
    );
    if (change !== undefined) classChanges[course.fullName] = change;
  }
  const now = schoolGpas(current.classes);
  const then = schoolGpas(previous.classes);
  return {
    classChanges,
    gpaChanges:
      now.weighted !== null &&
      then.weighted !== null &&
      now.unweighted !== null &&
      then.unweighted !== null
        ? {
            weighted: now.weighted - then.weighted,
            unweighted: now.unweighted - then.unweighted,
          }
        : undefined,
  };
}
