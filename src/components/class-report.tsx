"use client";

import { Calculator, User } from "lucide-react";
import Link from "next/link";
import { classGrade } from "@/lib/grades";
import { useReport } from "@/lib/report/store";
import { GradeChange, GradeMark } from "./grade-mark";
import { GradingMethodHelp } from "./grading-method-help";
import { SectionDisplay } from "./section-display";
import { Button } from "./ui/button";

export function ClassReport({ index }: { index: number }) {
  const report = useReport((x) => x.report);
  const loading = useReport((x) => x.loading);
  const changes = useReport((x) => x.classChanges);

  if (!report) {
    return loading
      ? "Loading your gradebook…"
      : "Open your gradebook to load this class.";
  }

  const cls = report.classes[index];

  if (!cls) {
    return "Class not found";
  }

  const percentage = classGrade(cls);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="min-w-0">
          <h1 className="wrap-break-word text-2xl font-bold tracking-tight sm:text-3xl">
            {cls.displayName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {cls.instructor && (
              <span className="inline-flex items-center gap-1.5">
                <User className="size-4 shrink-0" aria-hidden="true" />
                {cls.instructor}
              </span>
            )}
            <GradingMethodHelp method={cls.gradingMethod} />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 sm:flex-col sm:items-end">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Current grade</p>
            <div className="flex flex-wrap items-center gap-2">
              <GradeMark percentage={percentage} />
              <GradeChange value={changes[cls.fullName]} />
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link
              href={`/final-calculator?course=${encodeURIComponent(cls.fullName)}`}
            >
              <Calculator /> Grade &amp; final calculator
            </Link>
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {cls.sections.map((x) => (
          <SectionDisplay
            key={`${x.name}-${x.description ?? ""}-${x.weight ?? "points"}`}
            section={x}
            cls={cls}
          />
        ))}
      </div>
    </>
  );
}
