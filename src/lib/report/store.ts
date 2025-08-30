import { Report } from "@/types/report";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Store {
  reportUrl: string;
  report?: Report;

  setReport: (report: Report) => void;
  setReportUrl: (reportUrl: string) => void;
}

export const useReport = create(
  persist<Store>(
    (set, get) => ({
      reportUrl: "",
      report: undefined,

      setReport: (report: Report) => set({ report }),
      setReportUrl: (reportUrl: string) => set({ reportUrl }),
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
