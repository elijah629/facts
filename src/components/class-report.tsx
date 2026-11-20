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
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="min-w-0 wrap-break-word text-2xl font-bold tracking-tight sm:text-3xl">
            {cls.displayName}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="sr-only">Current grade</span>
            <GradeMark percentage={percentage} />
            <GradeChange value={changes[cls.fullName]} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {cls.instructor && (
              <span className="inline-flex items-center gap-1.5">
                <User className="size-4 shrink-0" aria-hidden="true" />
                {cls.instructor}
              </span>
            )}
            <GradingMethodHelp method={cls.gradingMethod} />
          </div>
          <Button asChild size="sm" variant="outline">
            <Link
              href={`/final-calculator?course=${encodeURIComponent(cls.fullName)}`}
            >
              <Calculator /> Grade &amp; final calculator
            </Link>
          </Button>
        </div>
      </header>
      <div className="flex flex-col gap-4">
        {cls.sections.map((x) => (
          <SectionDisplay
            key={`${x.name}-${x.description ?? ""}-${x.weight ?? "points"}`}
            section={x}
            cls={cls}
          />
        ))}
      </div>
    </div>
  );
}
