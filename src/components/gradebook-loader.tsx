"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { GradebookChange } from "@/lib/gradebook/changes";
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

let pending: Promise<void> | undefined;

export function refreshGradebook() {
  if (pending) return pending;
  useReport.setState({ loading: true });
  pending = fetch("/api/grades?view=dashboard", { cache: "no-store" })
    .then(async (response) => {
      const { setSyncResult } = useReport.getState();
      if (response.status === 401) {
        setSyncResult({ authenticated: false });
        return;
      }
      if (!response.ok) throw new Error("SYNC_REQUEST_FAILED");
      const body = (await response.json()) as {
        report: Report | null;
        changes: GradebookChange[];
        changesObservedAt?: string;
        freshness: {
          stale: boolean;
          errorCode?: string;
          lastSuccessfulFactsFetch?: string;
        };
      };
      setSyncResult({
        authenticated: true,
        report: body.report ? reviveDates(body.report) : undefined,
        stale: body.freshness.stale,
        error: body.freshness.errorCode,
        lastSuccessfulFactsFetch: body.freshness.lastSuccessfulFactsFetch,
        changes: body.changes,
        changesObservedAt: body.changesObservedAt,
      });
    })
    .catch(() => {
      useReport.setState({
        loading: false,
        stale: true,
        syncError: "SYNC_REQUEST_FAILED",
      });
    })
    .finally(() => {
      pending = undefined;
    });
  return pending;
}

export function GradebookLoader() {
  const pathname = usePathname();
  const needsGradebook =
    pathname === "/" ||
    pathname === "/final-calculator" ||
    pathname.startsWith("/class/");
  useEffect(() => {
    if (needsGradebook && useReport.getState().loading) void refreshGradebook();
  }, [needsGradebook]);
  return null;
}
