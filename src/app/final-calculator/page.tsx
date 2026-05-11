"use client";

import {
  ArrowRightLeft,
  BookOpenCheck,
  Calculator,
  GraduationCap,
  Info,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  classGrade,
  sectionGradeUnweighted,
  sectionGradeWeighted,
} from "@/lib/grades";
import { useReport } from "@/lib/report/store";
import type { Assignment, Class } from "@/types/report";

type CalculatorMode = "required" | "projected";

type LowestAssignment = {
  assignment: Assignment;
  index: number;
  percent: number;
};

const FINAL_SEARCH_MAX = 200;

function parsePercent(value: string): number | null {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed / 100;
}

function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

function assignmentPercent(assignment: Assignment): number | null {
  if (assignment.status === "excuse") {
    return null;
  }

  if (assignment.maxPoints === 0) {
    return null;
  }

  if (assignment.status === "missing") {
    return 0;
  }

  return assignment.points / assignment.maxPoints;
}

function selectedSectionGrade(
  cls: Class,
  sectionIndex: number,
): number | false {
  const section = cls.sections[sectionIndex];

  if (!section) {
    return false;
  }

  if (cls.gradingMethod === "mixed") {
    return sectionGradeWeighted(section, cls.roundingPrecision);
  }

  return sectionGradeUnweighted(section);
}

function findLowestAssignment(
  cls: Class | undefined,
  sectionIndex: number | null,
): LowestAssignment | null {
  if (!cls || sectionIndex === null) {
    return null;
  }

  const section = cls.sections[sectionIndex];

  if (!section) {
    return null;
  }

  return section.assignments.reduce<LowestAssignment | null>(
    (currentLowest, assignment, index) => {
      const percent = assignmentPercent(assignment);

      if (percent === null) {
        return currentLowest;
      }

      if (!currentLowest || percent < currentLowest.percent) {
        return { assignment, index, percent };
      }

      return currentLowest;
    },
    null,
  );
}

function replacementAssignment(
  originalAssignment: Assignment,
  finalPercent: number,
): Assignment {
  if (originalAssignment.status === "excuse") {
    return originalAssignment;
  }

  return {
    ...originalAssignment,
    name: `${originalAssignment.name} (replaced by final)`,
    points: finalPercent * originalAssignment.maxPoints,
    status: "valid",
  };
}

function classWithLowestReplaced(
  cls: Class,
  sectionIndex: number | null,
  finalPercent: number,
): Class {
  const lowest = findLowestAssignment(cls, sectionIndex);

  if (sectionIndex === null || !lowest) {
    return cls;
  }

  return {
    ...cls,
    sections: cls.sections.map((section, index) => {
      if (index !== sectionIndex) {
        return section;
      }

      return {
        ...section,
        assignments: section.assignments.map((assignment, assignmentIndex) =>
          assignmentIndex === lowest.index
            ? replacementAssignment(assignment, finalPercent)
            : assignment,
        ),
      };
    }),
  };
}

function gradeWithFinalCategory(
  cls: Class,
  finalSectionIndex: number,
  finalPercent: number,
  dropSectionIndex: number | null,
): number | null {
  if (cls.gradingMethod === "points") {
    return null;
  }

  const adjustedClass = classWithLowestReplaced(
    cls,
    dropSectionIndex,
    finalPercent,
  );
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [index, section] of adjustedClass.sections.entries()) {
    const grade =
      index === finalSectionIndex
        ? finalPercent
        : selectedSectionGrade(adjustedClass, index);

    if (grade === false) {
      continue;
    }

    weightedSum += grade * (section.weight ?? 0);
    totalWeight += section.weight ?? 0;
  }

  if (totalWeight === 0) {
    return null;
  }

  return weightedSum / totalWeight;
}

function requiredFinalScore(
  cls: Class,
  finalSectionIndex: number,
  targetPercent: number,
  dropSectionIndex: number | null,
): { score: number | null; minGrade: number | null; maxGrade: number | null } {
  const minGrade = gradeWithFinalCategory(
    cls,
    finalSectionIndex,
    0,
    dropSectionIndex,
  );
  const maxGrade = gradeWithFinalCategory(
    cls,
    finalSectionIndex,
    FINAL_SEARCH_MAX / 100,
    dropSectionIndex,
  );

  if (minGrade === null || maxGrade === null) {
    return { maxGrade, minGrade, score: null };
  }

  if (targetPercent <= minGrade) {
    return { maxGrade, minGrade, score: 0 };
  }

  if (targetPercent > maxGrade) {
    return { maxGrade, minGrade, score: null };
  }

  let low = 0;
  let high = FINAL_SEARCH_MAX;

  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const grade = gradeWithFinalCategory(
      cls,
      finalSectionIndex,
      mid / 100,
      dropSectionIndex,
    );

    if (grade !== null && grade >= targetPercent) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return { maxGrade, minGrade, score: high };
}

function useSelectedClass(
  reportClasses: Class[],
  classIndex: string | undefined,
) {
  return useMemo(() => {
    if (classIndex === undefined) {
      return undefined;
    }

    return reportClasses[Number(classIndex)];
  }, [classIndex, reportClasses]);
}

export default function FinalCalculator() {
  const report = useReport((x) => x.report);
  const classes =
    report?.classes.filter((cls) => cls.gradingMethod !== "points") ?? [];
  const [classIndex, setClassIndex] = useState<string | undefined>(undefined);
  const [finalSectionIndex, setFinalSectionIndex] = useState<
    string | undefined
  >(undefined);
  const [dropLowest, setDropLowest] = useState(false);
  const [dropSectionIndex, setDropSectionIndex] = useState<string | undefined>(
    undefined,
  );
  const [mode, setMode] = useState<CalculatorMode>("required");
  const [goal, setGoal] = useState<string>("90");
  const [finalScore, setFinalScore] = useState<string>("85");
  const [showWhatIfRange, setShowWhatIfRange] = useState(true);

  const selectedClass = useSelectedClass(classes, classIndex);
  const selectedFinalSection =
    selectedClass && finalSectionIndex !== undefined
      ? selectedClass.sections[Number(finalSectionIndex)]
      : undefined;
  const selectedDropSection =
    selectedClass && dropSectionIndex !== undefined
      ? selectedClass.sections[Number(dropSectionIndex)]
      : undefined;
  const activeDropSectionIndex =
    dropLowest && dropSectionIndex !== undefined
      ? Number(dropSectionIndex)
      : null;
  const lowestAssignment = findLowestAssignment(
    selectedClass,
    activeDropSectionIndex,
  );
  const currentGrade = selectedClass ? classGrade(selectedClass) : null;
  const finalSectionGrade =
    selectedClass && finalSectionIndex !== undefined
      ? selectedSectionGrade(selectedClass, Number(finalSectionIndex))
      : false;

  const targetPercent = parsePercent(goal);
  const finalPercent = parsePercent(finalScore);
  const dropSelectionReady = !dropLowest || dropSectionIndex !== undefined;
  const projectedGrade =
    selectedClass &&
    finalSectionIndex !== undefined &&
    finalPercent !== null &&
    dropSelectionReady
      ? gradeWithFinalCategory(
          selectedClass,
          Number(finalSectionIndex),
          finalPercent,
          activeDropSectionIndex,
        )
      : null;
  const requiredResult =
    selectedClass &&
    finalSectionIndex !== undefined &&
    targetPercent !== null &&
    dropSelectionReady
      ? requiredFinalScore(
          selectedClass,
          Number(finalSectionIndex),
          targetPercent,
          activeDropSectionIndex,
        )
      : null;

  if (!report) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-primary/10 px-4 py-10">
        <Card className="mx-auto max-w-xl border-dashed text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Load a report first</CardTitle>
            <CardDescription>
              The final calculator uses your imported categories, weights, and
              assignments to run what-if projections.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-primary/10 px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <section className="rounded-3xl border bg-card p-6 shadow-sm md:p-8">
          <div className="grid gap-5 md:grid-cols-[1.4fr_0.6fr] md:items-end">
            <div className="space-y-3">
              <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
                Final grade calculator
              </h1>
              <p className="max-w-2xl text-muted-foreground text-lg">
                Pick the final category, enter either your goal or final score,
                and optionally use that same final score to replace the lowest
                score in another category.
              </p>
            </div>
            <div className="rounded-2xl border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <GraduationCap className="size-4" /> Current grade
              </div>
              <div className="mt-2 text-3xl font-bold">
                {currentGrade === null ? "—" : formatPercent(currentGrade)}
              </div>
              <div className="mt-1 line-clamp-1 text-muted-foreground text-sm">
                {selectedClass?.displayName ?? "Select a class"}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Calculator className="size-6" /> Setup
              </CardTitle>
              <CardDescription>
                Finals are calculated as their own weighted category. The drop
                option only replaces an existing score in another category.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-2">
                <Label>Class</Label>
                <Select
                  value={classIndex}
                  onValueChange={(value) => {
                    setClassIndex(value);
                    setFinalSectionIndex(undefined);
                    setDropSectionIndex(undefined);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>
                        Classes with weighted categories
                      </SelectLabel>
                      {classes.map((cls, index) => (
                        <SelectItem key={cls.fullName} value={index.toString()}>
                          <GraduationCap className="size-4" />
                          {cls.displayName}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Final category</Label>
                <Select
                  disabled={!selectedClass}
                  value={finalSectionIndex}
                  onValueChange={(value) => {
                    setFinalSectionIndex(value);
                    if (dropSectionIndex === value) {
                      setDropSectionIndex(undefined);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select the final category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Categories</SelectLabel>
                      {selectedClass?.sections.map((section, index) => (
                        <SelectItem key={section.name} value={index.toString()}>
                          <BookOpenCheck className="size-4" />
                          {section.name}
                          {section.weight !== undefined && (
                            <span className="text-muted-foreground">
                              {formatPercent(section.weight, 0)}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <ArrowRightLeft className="size-4" /> Replace lowest score
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Use the final score in the final category and also swap it
                      into the lowest score from a different category.
                    </p>
                  </div>
                  <Switch
                    checked={dropLowest}
                    onCheckedChange={setDropLowest}
                  />
                </div>

                {dropLowest && (
                  <div className="mt-4 grid gap-2">
                    <Label>Category to drop from</Label>
                    <Select
                      disabled={!selectedClass || !finalSectionIndex}
                      value={dropSectionIndex}
                      onValueChange={setDropSectionIndex}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category to improve" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Eligible categories</SelectLabel>
                          {selectedClass?.sections.map((section, index) => {
                            if (index.toString() === finalSectionIndex) {
                              return null;
                            }

                            return (
                              <SelectItem
                                key={section.name}
                                value={index.toString()}
                              >
                                <BookOpenCheck className="size-4" />
                                {section.name}
                              </SelectItem>
                            );
                          })}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-sm">
                      {lowestAssignment && selectedDropSection
                        ? `Lowest score: ${lowestAssignment.assignment.name} (${formatPercent(
                            lowestAssignment.percent,
                          )}) in ${selectedDropSection.name}.`
                        : "Choose a category with graded assignments to replace its lowest score."}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Target className="size-6" /> Calculate
                </CardTitle>
                <CardDescription>
                  Switch directions depending on whether you know your target
                  class grade or your final exam score.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 rounded-2xl bg-secondary p-1">
                  <button
                    type="button"
                    onClick={() => setMode("required")}
                    className={`rounded-xl px-3 py-3 font-medium text-sm transition ${
                      mode === "required"
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    Need on final
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("projected")}
                    className={`rounded-xl px-3 py-3 font-medium text-sm transition ${
                      mode === "projected"
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    Grade after final
                  </button>
                </div>

                {mode === "required" ? (
                  <div className="grid gap-2">
                    <Label htmlFor="goal">Goal class grade (%)</Label>
                    <Input
                      id="goal"
                      type="number"
                      min={0}
                      max={150}
                      step={0.1}
                      value={goal}
                      onChange={(event) => setGoal(event.target.value)}
                      placeholder="Example: 90"
                      className="h-12 text-lg"
                    />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="final-score">Final score (%)</Label>
                    <Input
                      id="final-score"
                      type="number"
                      min={0}
                      max={FINAL_SEARCH_MAX}
                      step={0.1}
                      value={finalScore}
                      onChange={(event) => setFinalScore(event.target.value)}
                      placeholder="Example: 85"
                      className="h-12 text-lg"
                    />
                  </div>
                )}

                <div className="rounded-3xl border bg-linear-to-br from-primary/15 to-secondary p-6">
                  <div className="text-muted-foreground text-sm">Result</div>
                  <div className="mt-2 text-4xl font-bold tracking-tight">
                    {mode === "required"
                      ? requiredResult?.score === null
                        ? "Not reachable"
                        : requiredResult
                          ? `${requiredResult.score.toFixed(2)}%`
                          : "—"
                      : projectedGrade === null
                        ? "—"
                        : formatPercent(projectedGrade)}
                  </div>
                  <p className="mt-3 text-muted-foreground text-sm">
                    {mode === "required"
                      ? requiredResult?.score === null &&
                        requiredResult.maxGrade !== null
                        ? `Even a ${FINAL_SEARCH_MAX}% final would only project to ${formatPercent(
                            requiredResult.maxGrade,
                          )}.`
                        : requiredResult
                          ? `Score needed in the final category to reach ${goal || "your goal"}%.`
                          : dropLowest && !dropSelectionReady
                            ? "Select the category whose lowest score should be replaced."
                            : "Select a class, final category, and goal to calculate."
                      : projectedGrade !== null
                        ? `Projected overall grade with a ${finalScore || "0"}% in the final category.`
                        : dropLowest && !dropSelectionReady
                          ? "Select the category whose lowest score should be replaced."
                          : "Select a class, final category, and final score to preview your grade."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-secondary p-4 text-sm">
                    <div className="text-muted-foreground">Final category</div>
                    <div className="mt-1 font-semibold">
                      {selectedFinalSection?.name ?? "None"}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-secondary p-4 text-sm">
                    <div className="text-muted-foreground">
                      Current category
                    </div>
                    <div className="mt-1 font-semibold">
                      {finalSectionGrade === false
                        ? "No graded work"
                        : formatPercent(finalSectionGrade)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-secondary p-4 text-sm">
                    <div className="text-muted-foreground">Weight</div>
                    <div className="mt-1 font-semibold">
                      {selectedFinalSection?.weight === undefined
                        ? "—"
                        : formatPercent(selectedFinalSection.weight, 0)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gap-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="size-5" /> Range
                </CardTitle>
                <CardDescription>
                  Optional check for the grade range this setup can produce.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
                  <div>
                    <div className="font-medium">Show range</div>
                    <div className="text-muted-foreground">
                      Compare projected grades at 0% and {FINAL_SEARCH_MAX}% in
                      the final category.
                    </div>
                  </div>
                  <Switch
                    checked={showWhatIfRange}
                    onCheckedChange={setShowWhatIfRange}
                  />
                </div>

                {showWhatIfRange && requiredResult && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border p-4">
                      <div className="text-muted-foreground">
                        If final is 0%
                      </div>
                      <div className="mt-1 text-2xl font-semibold">
                        {requiredResult.minGrade === null
                          ? "—"
                          : formatPercent(requiredResult.minGrade)}
                      </div>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <div className="text-muted-foreground">
                        If final is {FINAL_SEARCH_MAX}%
                      </div>
                      <div className="mt-1 text-2xl font-semibold">
                        {requiredResult.maxGrade === null
                          ? "—"
                          : formatPercent(requiredResult.maxGrade)}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
