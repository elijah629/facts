"use client";

import { ChartNoAxesColumnIncreasing } from "lucide-react";
import { useEffect, useState } from "react";
import type { SchoolRank } from "@/lib/gradebook/school-rank";
import { useReport } from "@/lib/report/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export function SchoolStanding() {
  const updatedAt = useReport((state) => state.lastUpdated);
  const [result, setResult] = useState<{
    updatedAt?: number;
    standing?: SchoolRank | null;
  }>();
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/grades/rank", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const { standing } = (await response.json()) as {
          standing: SchoolRank | null;
        };
        if (!controller.signal.aborted) setResult({ updatedAt, standing });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ updatedAt });
      });
    return () => controller.abort();
  }, [updatedAt]);

  const current = result?.updatedAt === updatedAt ? result : undefined;
  const standing = current?.standing;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartNoAxesColumnIncreasing className="size-5" aria-hidden="true" />
          School standing
        </CardTitle>
        <CardDescription>
          Unweighted term GPA among FACTS app users in your school or district.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {standing ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Rank</p>
                <p className="text-2xl font-semibold tabular-nums">
                  #{standing.rank}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    of {standing.total}
                  </span>
                </p>
              </div>
              <p className="text-sm font-medium tabular-nums">
                {standing.percentile}
                {ordinalSuffix(standing.percentile)} percentile
              </p>
            </div>
            <div
              role="img"
              aria-label={`Your percentile: ${standing.percentile} out of 100`}
            >
              <div className="relative mx-2 h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${standing.percentile}%` }}
                />
                <span
                  className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary"
                  style={{ left: `${standing.percentile}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs tabular-nums text-muted-foreground">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {!current
              ? "Loading your standing…"
              : standing === null
                ? "Standing is shown once at least 10 students have recent grades for the same term."
                : "School standing is temporarily unavailable."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ordinalSuffix(number: number) {
  if (number >= 11 && number <= 13) return "th";
  return (
    ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[number % 10] ??
    "th"
  );
}
