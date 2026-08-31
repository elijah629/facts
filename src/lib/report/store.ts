import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Report } from "@/types/report";

interface Store {
  reportUrl: string;
  lastUpdated?: number;
  report?: Report;
  weighted: boolean;

  setWeighted: (weighted: boolean) => void;
  setReport: (report: Report) => void;
  setReportUrl: (reportUrl: string) => void;
  clear: () => void;
}

function migrateStore(persistedState: unknown): Store {
  const state = persistedState as Store;

  if (!state.report) {
    return state;
  }

  return {
    ...state,
    report: {
      ...state.report,
      classes: state.report.classes.map((cls) => ({
        ...cls,
        sections: cls.sections.map((section) => ({
          ...section,
          assignments: section.assignments.map((assignment, sourceIndex) => ({
            ...assignment,
            sourceIndex,
          })),
        })),
      })),
    },
  };
}

export const useReport = create(
  persist<Store>(
    (set) => ({
      reportUrl: "",
      report: undefined,
      lastUpdated: undefined,
      weighted: true,

      setWeighted: (weighted: boolean) => set({ weighted }),
      setReport: (report: Report) => set({ report, lastUpdated: Date.now() }),
      setReportUrl: (reportUrl: string) => set({ reportUrl }),
      clear: () =>
        set({
          report: undefined,
          reportUrl: "",
          lastUpdated: undefined,
        }),
    }),
    {
      name: "report-storage",
      version: 5,
      migrate: migrateStore,
      /*partialize: ({ reportUrl, setReport, setReportUrl }) => ({
        reportUrl,
        setReport,
        setReportUrl,
      }),*/
    },
  ),
);
