"use client";

import { User } from "lucide-react";
import { classGrade, letterGrade } from "@/lib/grades";
import { useReport } from "@/lib/report/store";
import { GradingMethodHelp } from "./grading-method-help";
import { SectionDisplay } from "./section-display";
import { Badge } from "./ui/badge";

export function ClassReport({ index }: { index: number }) {
  const report = useReport((x) => x.report);

  if (!report) {
    return "Please load a report";
  }

  const cls = report.classes[index];

  if (!cls) {
    return "Class not found";
  }

  const percentage = classGrade(cls);
  const hasGrade = Number.isFinite(percentage);
  const letter = hasGrade ? letterGrade(percentage) : null;

  return (
    <>
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 wrap-break-word text-xl font-bold sm:text-3xl">
            {cls.displayName}
          </h1>
          {hasGrade && (
            <>
              <Badge variant="outline" className="font-mono">
                {(percentage * 100).toFixed(cls.roundingPrecision)}%
              </Badge>
              <Badge variant="default">{letter}</Badge>
            </>
          )}
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
