import { create } from "zustand";
import type { GradebookChange } from "@/lib/gradebook/changes";
import type { Report } from "@/types/report";

interface Store {
  lastUpdated?: number;
  report?: Report;
  weighted: boolean;
  loading: boolean;
  authenticated: boolean;
  stale: boolean;
  syncError?: string;
  changes: GradebookChange[];
  classChanges: Record<string, number>;
  gpaChanges?: { weighted: number; unweighted: number };
  changesObservedAt?: string;

  setWeighted: (weighted: boolean) => void;
  setSyncResult: (result: {
    report?: Report;
    authenticated: boolean;
    stale?: boolean;
    error?: string;
    lastSuccessfulFactsFetch?: string | null;
    changes?: GradebookChange[];
    classChanges?: Record<string, number>;
    gpaChanges?: { weighted: number; unweighted: number };
    changesObservedAt?: string;
  }) => void;
}

export const useReport = create<Store>((set) => ({
  report: undefined,
  lastUpdated: undefined,
  weighted: true,
  loading: true,
  authenticated: false,
  stale: false,
  changes: [],
  classChanges: {},

  setWeighted: (weighted: boolean) => set({ weighted }),
  setSyncResult: ({
    report,
    authenticated,
    stale = false,
    error,
    lastSuccessfulFactsFetch,
    changes = [],
    classChanges = {},
    gpaChanges,
    changesObservedAt,
  }) =>
    set({
      report,
      authenticated,
      stale,
      syncError: error,
      changes,
      classChanges,
      gpaChanges,
      changesObservedAt,
      loading: false,
      lastUpdated: lastSuccessfulFactsFetch
        ? Date.parse(lastSuccessfulFactsFetch)
        : undefined,
    }),
}));
