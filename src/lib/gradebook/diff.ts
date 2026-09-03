import { isDeepStrictEqual } from "node:util";
import type {
  CanonicalAssignment,
  CanonicalCategory,
  CanonicalClass,
  ClassDelta,
  GradebookDelta,
  GradebookState,
} from "./types";

function changedFields<T extends object>(previous: T, next: T): Partial<T> {
  const changed: Partial<T> = {};
  for (const key of Object.keys(next) as (keyof T)[]) {
    if (!isDeepStrictEqual(previous[key], next[key])) {
      changed[key] = next[key];
    }
  }
  return changed;
}

function mapChanges<T extends object>(
  previous: Record<string, T>,
  next: Record<string, T>,
): {
  added?: Record<string, T>;
  changed?: Record<string, Partial<T>>;
  removed?: string[];
} {
  const added: Record<string, T> = {};
  const changed: Record<string, Partial<T>> = {};
  const removed = Object.keys(previous).filter((id) => !(id in next));

  for (const [id, value] of Object.entries(next)) {
    if (!(id in previous)) added[id] = value;
    else {
      const fields = changedFields(previous[id], value);
      if (Object.keys(fields).length) changed[id] = fields;
    }
  }

  return {
    ...(Object.keys(added).length ? { added } : {}),
    ...(Object.keys(changed).length ? { changed } : {}),
    ...(removed.length ? { removed } : {}),
  };
}

function diffClass(previous: CanonicalClass, next: CanonicalClass): ClassDelta {
  const metadata = changedFields(
    {
      name: previous.name,
      displayName: previous.displayName,
      teacher: previous.teacher,
      term: previous.term,
    },
    {
      name: next.name,
      displayName: next.displayName,
      teacher: next.teacher,
      term: next.term,
    },
  );
  const grading = changedFields(
    {
      mode: previous.grading.mode,
      roundingPrecision: previous.grading.roundingPrecision,
    },
    {
      mode: next.grading.mode,
      roundingPrecision: next.grading.roundingPrecision,
    },
  );
  const categories = mapChanges<CanonicalCategory>(
    previous.grading.categories,
    next.grading.categories,
  );
  const assignments = mapChanges<CanonicalAssignment>(
    previous.assignments,
    next.assignments,
  );

  return {
    ...(Object.keys(metadata).length ? { set: metadata } : {}),
    ...(Object.keys(grading).length || Object.keys(categories).length
      ? {
          grading: {
            ...(Object.keys(grading).length ? { set: grading } : {}),
            ...(categories.added ? { categoriesAdded: categories.added } : {}),
            ...(categories.changed
              ? { categoriesChanged: categories.changed }
              : {}),
            ...(categories.removed
              ? { categoriesRemoved: categories.removed }
              : {}),
          },
        }
      : {}),
    ...(Object.keys(assignments).length
      ? {
          assignments: {
            ...(assignments.added ? { added: assignments.added } : {}),
            ...(assignments.changed ? { changed: assignments.changed } : {}),
            ...(assignments.removed ? { removed: assignments.removed } : {}),
          },
        }
      : {}),
  };
}

export function diffGradebooks(
  previous: GradebookState,
  next: GradebookState,
): GradebookDelta {
  const set = changedFields(
    {
      studentName: previous.studentName,
      term: previous.term,
      yearRange: previous.yearRange,
    },
    {
      studentName: next.studentName,
      term: next.term,
      yearRange: next.yearRange,
    },
  );
  const classesAdded: Record<string, CanonicalClass> = {};
  const classesChanged: Record<string, ClassDelta> = {};
  const classesRemoved = Object.keys(previous.classes).filter(
    (id) => !(id in next.classes),
  );

  for (const [id, cls] of Object.entries(next.classes)) {
    if (!(id in previous.classes)) classesAdded[id] = cls;
    else {
      const delta = diffClass(previous.classes[id], cls);
      if (Object.keys(delta).length) classesChanged[id] = delta;
    }
  }

  return {
    ...(Object.keys(set).length ? { set } : {}),
    ...(Object.keys(classesAdded).length ? { classesAdded } : {}),
    ...(Object.keys(classesChanged).length ? { classesChanged } : {}),
    ...(classesRemoved.length ? { classesRemoved } : {}),
  };
}
