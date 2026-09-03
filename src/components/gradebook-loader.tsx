"use client";

import { useEffect } from "react";
import { useReport } from "@/lib/report/store";
import type { Report } from "@/types/report";

function reviveDates(report: Report): Report {
  return {
    ...report,
    classes: report.classes.map((cls) => ({
      ...cls,
      sections: cls.sections.map((section) => ({
        ...section,
        assignments: section.assignments.map((assignment) => ({
          ...assignment,
          due: new Date(assignment.due),
        })),
      })),
    })),
  };
}

export function GradebookLoader() {
  const setSyncResult = useReport((state) => state.setSyncResult);

  useEffect(() => {
    let active = true;
    localStorage.removeItem("report-storage");
    fetch("/api/grades", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          if (active) setSyncResult({ authenticated: false });
          return;
        }
        const body = (await response.json()) as {
          report: Report | null;
          freshness?: {
            stale?: boolean;
            errorCode?: string;
            lastSuccessfulFactsFetch?: string | null;
          };
        };
        if (active) {
          setSyncResult({
            authenticated: true,
            report: body.report ? reviveDates(body.report) : undefined,
            stale: body.freshness?.stale,
            error: body.freshness?.errorCode,
            lastSuccessfulFactsFetch: body.freshness?.lastSuccessfulFactsFetch,
          });
        }
      })
      .catch(() => {
        if (active) {
          setSyncResult({
            authenticated: true,
            stale: true,
            error: "SYNC_REQUEST_FAILED",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [setSyncResult]);

  return null;
}
