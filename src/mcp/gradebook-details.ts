import type {
  CanonicalAssignment,
  GradebookState,
} from "@/lib/gradebook/types";

export function matchingClassIds(state: GradebookState, classId: string) {
  const query = classId.trim();
  if (Object.hasOwn(state.classes, query)) return [query];
  return Object.entries(state.classes)
    .filter(([, cls]) =>
      [cls.name, cls.displayName].some(
        (name) =>
          name.localeCompare(query, undefined, { sensitivity: "base" }) === 0,
      ),
    )
    .map(([id]) => id);
}

export function requireClassId(state: GradebookState | null, classId: string) {
  if (!state) throw new Error("GRADEBOOK_NOT_FOUND");
  const ids = matchingClassIds(state, classId);
  if (!ids.length) throw new Error("CLASS_NOT_FOUND");
  if (ids.length > 1) throw new Error("AMBIGUOUS_CLASS");
  return ids[0];
}

const assignmentStatuses = {
  valid: "graded",
  missing: "missing",
  excuse: "excused",
} as const;

export type AssignmentFilter = {
  classId?: string;
  status?: "graded" | "missing" | "excused";
  dueFrom?: string;
  dueThrough?: string;
  query?: string;
  includeDetails?: boolean;
  sort?: "due_asc" | "due_desc";
  offset?: number;
  limit?: number;
};

function formatAssignment(
  assignment: CanonicalAssignment,
  includeDetails: boolean,
) {
  const earned = assignment.earned === null ? null : Number(assignment.earned);
  const possible =
    assignment.possible === null ? null : Number(assignment.possible);
  const percentage =
    possible !== null && possible > 0 && assignment.status !== "excuse"
      ? assignment.status === "missing"
        ? 0
        : earned === null
          ? null
          : earned / possible
      : null;

  return {
    name: assignment.name,
    status: assignmentStatuses[assignment.status],
    dueDate: assignment.dueDate,
    earned,
    possible,
    percentage,
    excluded: assignment.excluded,
    extraCredit: assignment.extraCredit,
    ...(includeDetails
      ? {
          description: assignment.description?.slice(0, 1200) ?? null,
          note: assignment.note?.slice(0, 1200) ?? null,
          weight: assignment.weight,
          curve: assignment.curve,
          bonus: assignment.bonus,
          penalty: assignment.penalty,
        }
      : {}),
  };
}

export function assignmentPage(
  state: GradebookState | null,
  filter: AssignmentFilter,
) {
  if (!state) throw new Error("GRADEBOOK_NOT_FOUND");
  const classIds = filter.classId
    ? [requireClassId(state, filter.classId)]
    : Object.keys(state.classes);
  const query = filter.query?.toLowerCase();
  const direction = filter.sort === "due_desc" ? -1 : 1;
  const rows = classIds
    .flatMap((classId) => {
      const cls = state.classes[classId];
      return Object.entries(cls.assignments)
        .filter(([, assignment]) => {
          const day = assignment.dueDate.slice(0, 10);
          return (
            (!filter.status ||
              assignmentStatuses[assignment.status] === filter.status) &&
            (!filter.dueFrom || day >= filter.dueFrom) &&
            (!filter.dueThrough || day <= filter.dueThrough) &&
            (!query || assignment.name.toLowerCase().includes(query))
          );
        })
        .map(([assignmentId, assignment]) => ({
          assignment,
          assignmentId,
          classId,
          className: cls.displayName,
          category: cls.grading.categories[assignment.categoryId]?.name ?? null,
        }));
    })
    .sort(
      (left, right) =>
        direction *
          left.assignment.dueDate.localeCompare(right.assignment.dueDate) ||
        left.classId.localeCompare(right.classId) ||
        left.assignmentId.localeCompare(right.assignmentId),
    );
  const offset = filter.offset ?? 0;
  const end = offset + (filter.limit ?? 15);
  return {
    assignments: rows.slice(offset, end).map(({ assignment, ...row }) => ({
      ...row,
      categoryId: assignment.categoryId,
      ...formatAssignment(assignment, filter.includeDetails ?? false),
    })),
    total: rows.length,
    nextOffset: end < rows.length ? end : null,
  };
}
