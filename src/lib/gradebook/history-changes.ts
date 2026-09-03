import type { GradebookState } from "./types";

export interface HistoryChange {
  id: string;
  className: string;
  item: string;
  field: string;
  before: string;
  after: string;
  kind: "added" | "removed" | "changed";
}

type Value = string | number | boolean | null;
type Entry = { className: string; item: string; fields: Record<string, Value> };

// Flatten only for display, in memory. No duplicated diff/snapshot is stored.
function entries(state: GradebookState): Map<string, Entry> {
  const result = new Map<string, Entry>();
  result.set("report", {
    className: "Gradebook",
    item: "Report",
    fields: {
      studentName: state.studentName,
      term: state.term,
      yearStart: state.yearRange.min,
      yearEnd: state.yearRange.max,
    },
  });
  for (const [classId, cls] of Object.entries(state.classes)) {
    const className = cls.displayName;
    const prefix = `class:${classId}`;
    result.set(prefix, {
      className,
      item: "Class",
      fields: {
        name: cls.name,
        displayName: cls.displayName,
        teacher: cls.teacher,
        term: cls.term,
        mode: cls.grading.mode,
        roundingPrecision: cls.grading.roundingPrecision,
      },
    });
    for (const [id, category] of Object.entries(cls.grading.categories)) {
      result.set(`${prefix}/category:${id}`, {
        className,
        item: `Category: ${category.name}`,
        fields: { ...category },
      });
    }
    for (const [id, assignment] of Object.entries(cls.assignments)) {
      const { categoryId, ...fields } = assignment;
      result.set(`${prefix}/assignment:${id}`, {
        className,
        item: assignment.name,
        fields: {
          ...fields,
          category: cls.grading.categories[categoryId]?.name ?? categoryId,
        },
      });
    }
  }
  return result;
}

const labels: Record<string, string> = {
  studentName: "Student",
  term: "Term",
  yearStart: "School year starts",
  yearEnd: "School year ends",
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
};

function display(value: Value | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function historyChanges(
  previous: GradebookState,
  next: GradebookState,
): HistoryChange[] {
  const before = entries(previous);
  const after = entries(next);
  const changes: HistoryChange[] = [];
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const oldEntry = before.get(id);
    const newEntry = after.get(id);
    const entry = newEntry ?? oldEntry;
    if (!entry) continue;
    if (!oldEntry || !newEntry) {
      changes.push({
        id,
        className: entry.className,
        item: entry.item,
        field: "Record",
        before: oldEntry ? "Present" : "Not present",
        after: newEntry ? "Added" : "Removed",
        kind: newEntry ? "added" : "removed",
      });
    }
    // Show added/removed records' values too, not just a count or raw JSON.
    for (const field of new Set([
      ...Object.keys(oldEntry?.fields ?? {}),
      ...Object.keys(newEntry?.fields ?? {}),
    ])) {
      const oldValue = oldEntry?.fields[field];
      const newValue = newEntry?.fields[field];
      if (
        oldValue === newValue ||
        (!oldEntry && newValue === null) ||
        (!newEntry && oldValue === null)
      )
        continue;
      changes.push({
        id: `${id}/${field}`,
        className: entry.className,
        item: entry.item,
        field: labels[field] ?? field,
        before: display(oldValue),
        after: display(newValue),
        kind: !oldEntry ? "added" : !newEntry ? "removed" : "changed",
      });
    }
  }
  return changes;
}
