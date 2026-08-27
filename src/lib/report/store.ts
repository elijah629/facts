import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Report } from "@/types/report";

interface Store {
  reportUrl: string;
  reportUrls: string[];
  lastUpdated?: number;
  report?: Report;
  weighted: boolean;

  setWeighted: (weighted: boolean) => void;
  setReport: (report: Report) => void;
  setReportUrl: (reportUrl: string) => void;
  setReportUrls: (reportUrls: string[]) => void;
  clear: () => void;
}

export const useReport = create(
  persist<Store>(
    (set) => ({
      reportUrl: "",
      reportUrls: [],
      report: undefined,
      lastUpdated: undefined,
      weighted: true,

      setWeighted: (weighted: boolean) => set({ weighted }),
      setReport: (report: Report) => set({ report, lastUpdated: Date.now() }),
      setReportUrl: (reportUrl: string) => set({ reportUrl }),
      setReportUrls: (reportUrls: string[]) => set({ reportUrls }),
      clear: () =>
        set({
          report: undefined,
          reportUrl: "",
          reportUrls: [],
          lastUpdated: undefined,
        }),
    }),
    {
      name: "report-storage",
      version: 2,
      /*partialize: ({ reportUrl, setReport, setReportUrl }) => ({
        reportUrl,
        setReport,
        setReportUrl,
      }),*/
    },
  ),
);
