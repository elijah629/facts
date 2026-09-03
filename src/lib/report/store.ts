import { create } from "zustand";
import type { Report } from "@/types/report";

interface Store {
  lastUpdated?: number;
  report?: Report;
  weighted: boolean;
  loading: boolean;
  authenticated: boolean;
  stale: boolean;
  syncError?: string;

  setWeighted: (weighted: boolean) => void;
  setSyncResult: (result: {
    report?: Report;
    authenticated: boolean;
    stale?: boolean;
    error?: string;
    lastSuccessfulFactsFetch?: string | null;
  }) => void;
}

export const useReport = create<Store>((set) => ({
  report: undefined,
  lastUpdated: undefined,
  weighted: true,
  loading: true,
  authenticated: false,
  stale: false,

  setWeighted: (weighted: boolean) => set({ weighted }),
  setSyncResult: ({
    report,
    authenticated,
    stale = false,
    error,
    lastSuccessfulFactsFetch,
  }) =>
    set({
      report,
      authenticated,
      stale,
      syncError: error,
      loading: false,
      lastUpdated: lastSuccessfulFactsFetch
        ? Date.parse(lastSuccessfulFactsFetch)
        : undefined,
    }),
}));
