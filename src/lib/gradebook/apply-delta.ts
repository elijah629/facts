import type {
  CanonicalAssignment,
  CanonicalCategory,
  GradebookDelta,
  GradebookState,
} from "./types";

function applyMap<T extends object>(
  target: Record<string, T>,
  added: Record<string, T> | undefined,
  changed: Record<string, Partial<T>> | undefined,
  removed: string[] | undefined,
): void {
  for (const id of removed ?? []) delete target[id];
  Object.assign(target, structuredClone(added ?? {}));
  for (const [id, fields] of Object.entries(changed ?? {})) {
    if (!target[id]) throw new Error(`Delta references missing entity: ${id}`);
    target[id] = { ...target[id], ...structuredClone(fields) };
  }
}

export function applyGradebookDelta(
  previous: GradebookState,
  delta: GradebookDelta,
): GradebookState {
  const state = structuredClone(previous);
  if (delta.set) Object.assign(state, structuredClone(delta.set));
  for (const id of delta.classesRemoved ?? []) delete state.classes[id];
  Object.assign(state.classes, structuredClone(delta.classesAdded ?? {}));

  for (const [id, classDelta] of Object.entries(delta.classesChanged ?? {})) {
    const cls = state.classes[id];
    if (!cls) throw new Error(`Delta references missing class: ${id}`);
    if (classDelta.set) Object.assign(cls, structuredClone(classDelta.set));
    if (classDelta.grading?.set) {
      Object.assign(cls.grading, structuredClone(classDelta.grading.set));
    }
    applyMap<CanonicalCategory>(
      cls.grading.categories,
      classDelta.grading?.categoriesAdded,
      classDelta.grading?.categoriesChanged,
      classDelta.grading?.categoriesRemoved,
    );
    applyMap<CanonicalAssignment>(
      cls.assignments,
      classDelta.assignments?.added,
      classDelta.assignments?.changed,
      classDelta.assignments?.removed,
    );
  }
  return state;
}
