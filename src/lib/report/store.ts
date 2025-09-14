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

export const useReport = create(
  persist<Store>(
    (set) => ({
      reportUrl: "",
      report: undefined,
      lastUpdated: undefined,
      weighted: false,

      setWeighted: (weighted: boolean) => set({ weighted }),
      setReport: (report: Report) => set({ report, lastUpdated: Date.now() }),
      setReportUrl: (reportUrl: string) => set({ reportUrl }),
      clear: () => set({ report: undefined, lastUpdated: undefined }),
    }),
    {
      name: "report-storage",
      /*partialize: ({ reportUrl, setReport, setReportUrl }) => ({
        reportUrl,
        setReport,
        setReportUrl,
      }),*/
    },
  ),
);
