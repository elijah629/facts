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

const statusLabels = {
  valid: "Graded",
  missing: "Missing",
  excuse: "Excused",
};

function score(assignment: CanonicalAssignment) {
  if (assignment.earned === null) return null;
  return assignment.possible === null || Number(assignment.possible) === 0
    ? `${assignment.earned} points`
    : `${assignment.earned}/${assignment.possible}`;
}

function dueDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(date)
    : value;
}

export function assignmentHeadline(
  next: CanonicalAssignment,
  previous?: CanonicalAssignment,
): string | undefined {
  if (next.status !== previous?.status) {
    if (next.status === "missing") return `${next.name} was marked missing`;
    if (next.status === "excuse") return `${next.name} was excused`;
    if (previous && next.earned === null)
      return `${next.name} is no longer marked ${statusLabels[previous.status].toLowerCase()}`;
  }
  const oldScore = previous ? score(previous) : null;
  const newScore = score(next);
  if (previous?.status !== "valid" || oldScore !== newScore) {
    if (newScore !== null)
      return oldScore && previous?.status === "valid"
        ? `${next.name}: ${oldScore} to ${newScore}`
        : `${next.name} was graded: ${newScore}`;
    if (oldScore !== null) return `${next.name}’s score was removed`;
  }
  if (!previous) return `${next.name} was added`;
  if (next.dueDate !== previous.dueDate)
    return `${next.name} is now due ${dueDate(next.dueDate)}`;
  if (next.note !== previous.note) return `${next.name}’s teacher note changed`;
  if (next.description !== previous.description)
    return `${next.name}’s instructions changed`;
  if (next.excluded !== previous.excluded)
    return `${next.name} ${next.excluded ? "no longer counts" : "now counts"} toward your grade`;
  return undefined;
}

function assignmentDetails(
  previous: CanonicalAssignment,
  next: CanonicalAssignment,
) {
  return [
    ["Score", score(previous), score(next)],
    ["Status", statusLabels[previous.status], statusLabels[next.status]],
    ["Due date", dueDate(previous.dueDate), dueDate(next.dueDate)],
    ["Teacher note", previous.note, next.note],
  ].flatMap(([label, before, after]) =>
    before === after || !label
      ? []
      : [{ label, before: before ?? "—", after: after ?? "—" }],
  );
}

export function historyChanges(
  previous: GradebookState,
  next: GradebookState,
): HistoryChange[] {
  const changes: HistoryChange[] = [];
  if (
    previous.term !== next.term ||
    previous.yearRange.min !== next.yearRange.min ||
    previous.yearRange.max !== next.yearRange.max
  ) {
    changes.push({
      id: "report",
      className: "Gradebook",
      item: "Term",
      kind: "changed",
      summary: "A new term or school year began",
      details: [],
    });
  }
  for (const classId of new Set([
    ...Object.keys(previous.classes),
    ...Object.keys(next.classes),
  ])) {
    const before = previous.classes[classId];
    const after = next.classes[classId];
    const name = (after ?? before).displayName;
    if (!before || !after) {
      changes.push({
        id: `class:${classId}`,
        className: name,
        item: name,
        kind: after ? "added" : "removed",
        summary: `${name} was ${after ? "added" : "removed"}`,
        details: [],
      });
      continue;
    }
    for (const id of new Set([
      ...Object.keys(before.assignments),
      ...Object.keys(after.assignments),
    ])) {
      const oldAssignment = before.assignments[id];
      const newAssignment = after.assignments[id];
      const assignment = newAssignment ?? oldAssignment;
      const summary = newAssignment
        ? assignmentHeadline(newAssignment, oldAssignment)
        : `${assignment.name} was removed`;
      if (!summary) continue;
      changes.push({
        id: `assignment:${classId}:${id}`,
        className: name,
        item: assignment.name,
        kind: !oldAssignment ? "added" : !newAssignment ? "removed" : "changed",
        summary,
        details:
          oldAssignment && newAssignment
            ? assignmentDetails(oldAssignment, newAssignment)
            : [],
      });
    }
  }
  return changes;
}
