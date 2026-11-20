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
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 wrap-break-word text-xl font-bold sm:text-3xl">
            {cls.displayName}
          </h1>
          <GradeMark percentage={percentage} />
          <GradeChange value={changes[cls.fullName]} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
          <h2 className="wrap-break-word text-sm font-mono text-muted-foreground">
            {cls.fullName}
          </h2>
          <div className="flex items-center gap-2">
            <User />
            <span>{cls.instructor}</span>
          </div>
          <GradingMethodHelp method={cls.gradingMethod} />
        </div>
        <div className="mt-4">
          <Button asChild variant="outline">
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
