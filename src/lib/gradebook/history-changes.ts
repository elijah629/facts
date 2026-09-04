import type { CanonicalAssignment, GradebookState } from "./types";

export interface HistoryDetail {
  label: string;
  before: string;
  after: string;
}
export interface HistoryChange {
  id: string;
  className: string;
  item: string;
  kind: "added" | "removed" | "changed";
  summary: string;
  details: HistoryDetail[];
}

type Value = string | number | boolean | null | undefined;
const labels: Record<string, string> = {
  studentName: "Student name",
  term: "Term",
  name: "Name",
  displayName: "Display name",
  teacher: "Teacher",
  mode: "Grading method",
  roundingPrecision: "Rounding precision",
  description: "Description",
  weight: "Weight",
  category: "Category",
  earned: "Points earned",
  possible: "Points possible",
  status: "Status",
  excluded: "Excluded from grade",
  extraCredit: "Extra credit",
  dueDate: "Due date",
  note: "Note",
  curve: "Curve",
  bonus: "Bonus",
  penalty: "Penalty",
  schoolYear: "School year",
};
const statusLabels: Record<string, string> = {
  valid: "Graded",
  missing: "Missing",
  excuse: "Excused",
};
function display(value: Value, field: string): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (field === "status") return statusLabels[String(value)] ?? String(value);
  if (field === "dueDate") {
    const date = new Date(String(value));
    if (Number.isFinite(date.getTime()))
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
  }
  return String(value);
}
function details(before: Record<string, Value>, after: Record<string, Value>) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(
      (key) =>
        before[key] !== after[key] &&
        !(before[key] == null && after[key] == null),
    )
    .map((key) => ({
      label: labels[key] ?? key,
      before: display(before[key], key),
      after: display(after[key], key),
    }));
}
function score(assignment: CanonicalAssignment) {
  if (assignment.earned === null) return "not graded";
  return assignment.possible === null
    ? `${assignment.earned} points`
    : `${assignment.earned}/${assignment.possible}`;
}
function assignmentFields(
  state: GradebookState,
  classId: string,
  assignment?: CanonicalAssignment,
): Record<string, Value> {
  if (!assignment) return {};
  const { categoryId, ...fields } = assignment;
  return {
    ...fields,
    category:
      state.classes[classId]?.grading.categories[categoryId]?.name ??
      categoryId,
  };
}

// Presentation is derived in memory; neither sentences nor calculated grades enter storage.
export function historyChanges(
  previous: GradebookState,
  next: GradebookState,
): HistoryChange[] {
  const changes: HistoryChange[] = [];
  function add(
    id: string,
    className: string,
    item: string,
    before: Record<string, Value>,
    after: Record<string, Value>,
    summary: string,
    kind: HistoryChange["kind"] = "changed",
  ) {
    const changed = details(before, after);
    if (changed.length || kind !== "changed")
      changes.push({ id, className, item, summary, kind, details: changed });
  }
  add(
    "report",
    "Gradebook",
    "Gradebook details",
    {
      studentName: previous.studentName,
      term: previous.term,
      schoolYear: `${previous.yearRange.min}–${previous.yearRange.max}`,
    },
    {
      studentName: next.studentName,
      term: next.term,
      schoolYear: `${next.yearRange.min}–${next.yearRange.max}`,
    },
    previous.term !== next.term ||
      previous.yearRange.min !== next.yearRange.min ||
      previous.yearRange.max !== next.yearRange.max
      ? "Your gradebook moved to a new term or school year"
      : "Your gradebook details changed",
  );
  for (const classId of new Set([
    ...Object.keys(previous.classes),
    ...Object.keys(next.classes),
  ])) {
    const before = previous.classes[classId];
    const after = next.classes[classId];
    const cls = after ?? before;
    if (!before || !after) {
      add(
        `class:${classId}`,
        cls.displayName,
        cls.displayName,
        before ? { teacher: before.teacher, term: before.term } : {},
        after ? { teacher: after.teacher, term: after.term } : {},
        `${cls.displayName} was ${after ? "added" : "removed"}`,
        after ? "added" : "removed",
      );
      continue;
    }
    const {
      assignments: _oldAssignments,
      grading: oldGrading,
      ...oldMeta
    } = before;
    const {
      assignments: _newAssignments,
      grading: newGrading,
      ...newMeta
    } = after;
    add(
      `class:${classId}`,
      cls.displayName,
      "Class details",
      oldMeta,
      newMeta,
      `${cls.displayName} details changed`,
    );
    const { categories: oldCategories, ...oldRules } = oldGrading;
    const { categories: newCategories, ...newRules } = newGrading;
    add(
      `rules:${classId}`,
      cls.displayName,
      "Grading rules",
      oldRules,
      newRules,
      `${cls.displayName} grading rules changed`,
    );
    for (const id of new Set([
      ...Object.keys(oldCategories),
      ...Object.keys(newCategories),
    ])) {
      const oldCategory = oldCategories[id];
      const newCategory = newCategories[id];
      const name = (newCategory ?? oldCategory).name;
      add(
        `category:${classId}:${id}`,
        cls.displayName,
        name,
        oldCategory ? { ...oldCategory } : {},
        newCategory ? { ...newCategory } : {},
        `${name} category was ${!oldCategory ? "added" : !newCategory ? "removed" : "updated"}`,
        !oldCategory ? "added" : !newCategory ? "removed" : "changed",
      );
    }
    for (const id of new Set([
      ...Object.keys(before.assignments),
      ...Object.keys(after.assignments),
    ])) {
      const oldAssignment = before.assignments[id];
      const newAssignment = after.assignments[id];
      const assignment = newAssignment ?? oldAssignment;
      let summary: string;
      if (!oldAssignment || !newAssignment) {
        summary = `${assignment.name} was ${newAssignment ? "added" : "removed"}`;
        if (assignment.status !== "valid")
          summary += ` · ${statusLabels[assignment.status]}`;
        else if (assignment.earned !== null)
          summary += ` · ${score(assignment)}`;
      } else {
        const parts: string[] = [];
        if (
          oldAssignment.earned !== newAssignment.earned ||
          oldAssignment.possible !== newAssignment.possible
        )
          parts.push(
            `changed from ${score(oldAssignment)} to ${score(newAssignment)}`,
          );
        if (oldAssignment.status !== newAssignment.status)
          parts.push(
            `was marked ${statusLabels[newAssignment.status].toLowerCase()}`,
          );
        if (oldAssignment.excluded !== newAssignment.excluded)
          parts.push(
            newAssignment.excluded
              ? "no longer counts toward your grade"
              : "now counts toward your grade",
          );
        summary = `${assignment.name} ${parts.length ? parts.join("; ") : "was updated"}`;
      }
      add(
        `assignment:${classId}:${id}`,
        cls.displayName,
        assignment.name,
        assignmentFields(previous, classId, oldAssignment),
        assignmentFields(next, classId, newAssignment),
        summary,
        !oldAssignment ? "added" : !newAssignment ? "removed" : "changed",
      );
    }
  }
  return changes;
}
