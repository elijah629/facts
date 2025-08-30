"use client";

import { Dot, Presentation } from "lucide-react";
import { classGrade, letterGrade } from "@/lib/grades";
import { Badge } from "./ui/badge";
import { SectionDisplay } from "./section-display";
import { useReport } from "@/lib/report/store";

export function ClassReport({ index }: { index: number }) {
  const report = useReport((x) => x.report);

  if (!report) {
    return <>Please load a report</>;
  }

  const cls = report.classes[index];

  if (!cls) {
    return <>Class not found</>;
  }

  const percentage = classGrade(cls);
  const letter = letterGrade(percentage);

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">{cls.displayName}</h1>
          <Badge variant="outline">{percentage.toFixed(3)}%</Badge>
          <Badge variant="default">{letter}</Badge>
        </div>
        <div className="flex flex-col items-center sm:flex-row gap-4 text-muted-foreground">
          <h2 className="text-sm text-muted-foreground">{cls.fullName}</h2>
          <Dot size={16} />
          <div className="flex items-center gap-2">
            <Presentation className="h-4 w-4" />
            <span>{cls.instructor}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {cls.sections.map((x) => (
          <SectionDisplay key={x.name} section={x} />
        ))}
      </div>
    </>
  );
}
