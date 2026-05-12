"use client";

import {
  ArrowRightLeft,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  GraduationCap,
  Info,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
type FinalPlacement = "category" | "add-assignment" | "replace-lowest";

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

function gradeWithCategoryOverride(
  cls: Class,
  sectionIndex: number,
  finalPercent: number,
): number | null {
  if (cls.gradingMethod === "points") {
    return null;
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [index, section] of cls.sections.entries()) {
    const grade =
      index === sectionIndex ? finalPercent : selectedSectionGrade(cls, index);

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

function finalAssignment(finalPercent: number, maxPoints = 100): Assignment {
  return {
    due: new Date(),
    maxPoints,
    name: "What-if final exam",
    points: finalPercent * maxPoints,
    status: "valid",
  };
}

function cloneClassWithFinalAssignment(
  cls: Class,
  sectionIndex: number,
  finalPercent: number,
  replaceLowest: boolean,
): Class | null {
  const section = cls.sections[sectionIndex];

  if (!section) {
    return null;
  }

  const sections = cls.sections.map((currentSection, index) => {
    if (index !== sectionIndex) {
      return currentSection;
    }

    let assignments = [...currentSection.assignments];

    if (replaceLowest) {
      const lowest = assignments.reduce<{
        index: number;
        percent: number;
        maxPoints: number;
      } | null>((currentLowest, assignment, assignmentIndex) => {
        const percent = assignmentPercent(assignment);

        if (percent === null) {
          return currentLowest;
        }

        const maxPoints =
          assignment.status === "valid" || assignment.status === "missing"
            ? assignment.maxPoints
            : 100;

        if (!currentLowest || percent < currentLowest.percent) {
          return { index: assignmentIndex, maxPoints, percent };
        }

        return currentLowest;
      }, null);

      if (lowest) {
        assignments[lowest.index] = finalAssignment(
          finalPercent,
          lowest.maxPoints,
        );
      } else {
        assignments = [...assignments, finalAssignment(finalPercent)];
      }
    } else {
      assignments = [...assignments, finalAssignment(finalPercent)];
    }

    return { ...currentSection, assignments };
  });

  return { ...cls, sections };
}

function gradeWithFinal(
  cls: Class,
  sectionIndex: number,
  placement: FinalPlacement,
  finalPercent: number,
): number | null {
  if (placement === "category") {
    return gradeWithCategoryOverride(cls, sectionIndex, finalPercent);
  }

  const classWithFinal = cloneClassWithFinalAssignment(
    cls,
    sectionIndex,
    finalPercent,
    placement === "replace-lowest",
  );

  if (!classWithFinal) {
    return null;
  }

  return classGrade(classWithFinal);
}

function requiredFinalScore(
  cls: Class,
  sectionIndex: number,
  placement: FinalPlacement,
  targetPercent: number,
): { score: number | null; minGrade: number | null; maxGrade: number | null } {
  const minGrade = gradeWithFinal(cls, sectionIndex, placement, 0);
  const maxGrade = gradeWithFinal(
    cls,
    sectionIndex,
    placement,
    FINAL_SEARCH_MAX / 100,
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
    const grade = gradeWithFinal(cls, sectionIndex, placement, mid / 100);

    if (grade !== null && grade >= targetPercent) {
      high = mid;
    } else {
      low = mid;
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
  const [classIndex, setClassIndex] = useState<string | undefined>(undefined);
  const [sectionIndex, setSectionIndex] = useState<string | undefined>(
    undefined,
  );
  const [mode, setMode] = useState<CalculatorMode>("required");
  const [placement, setPlacement] = useState<FinalPlacement>("category");
  const [goal, setGoal] = useState<string>("90");
  const [finalScore, setFinalScore] = useState<string>("85");
  const [showWhatIfRange, setShowWhatIfRange] = useState(true);

  const selectedClass = useSelectedClass(report?.classes ?? [], classIndex);
  const selectedSection =
    selectedClass && sectionIndex !== undefined
      ? selectedClass.sections[Number(sectionIndex)]
      : undefined;
  const currentGrade = selectedClass ? classGrade(selectedClass) : null;
  const currentSectionGrade =
    selectedClass && sectionIndex !== undefined
      ? selectedSectionGrade(selectedClass, Number(sectionIndex))
      : false;

  const targetPercent = parsePercent(goal);
  const finalPercent = parsePercent(finalScore);
  const projectedGrade =
    selectedClass && sectionIndex !== undefined && finalPercent !== null
      ? gradeWithFinal(
          selectedClass,
          Number(sectionIndex),
          placement,
          finalPercent,
        )
      : null;
  const requiredResult =
    selectedClass && sectionIndex !== undefined && targetPercent !== null
      ? requiredFinalScore(
          selectedClass,
          Number(sectionIndex),
          placement,
          targetPercent,
        )
      : null;

  const noReport = !report;

  if (noReport) {
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
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="grid gap-6 p-6 md:grid-cols-[1.25fr_0.75fr] md:p-8">
            <div className="space-y-5">
              <Badge
                variant="secondary"
                className="gap-2 rounded-full px-3 py-1"
              >
                <Sparkles className="size-3.5" /> Redesigned what-if planner
              </Badge>
              <div className="space-y-3">
                <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
                  Final grade calculator
                </h1>
                <p className="max-w-2xl text-muted-foreground text-lg">
                  Choose a class, pick how the final should count, then either
                  solve for the score you need or enter a final score to preview
                  the grade you would earn.
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border bg-background/60 p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <GraduationCap className="size-4" /> Current class snapshot
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-secondary p-4">
                  <div className="text-muted-foreground text-xs">Class</div>
                  <div className="mt-1 line-clamp-2 font-semibold">
                    {selectedClass?.displayName ?? "Pick a class"}
                  </div>
                </div>
                <div className="rounded-xl bg-primary p-4 text-primary-foreground">
                  <div className="text-xs opacity-80">Current grade</div>
                  <div className="mt-1 text-2xl font-bold">
                    {currentGrade === null ? "—" : formatPercent(currentGrade)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="gap-5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Calculator className="size-6" /> Set up the final
              </CardTitle>
              <CardDescription>
                These options control the scenario used by both calculators.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-2">
                <Label>Class</Label>
                <Select
                  value={classIndex}
                  onValueChange={(value) => {
                    setClassIndex(value);
                    setSectionIndex(undefined);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Classes</SelectLabel>
                      {report.classes.map((cls, index) => (
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
                <Label>Category / section</Label>
                <Select
                  disabled={!selectedClass}
                  value={sectionIndex}
                  onValueChange={setSectionIndex}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select where the final counts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Sections</SelectLabel>
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

              <div className="grid gap-2">
                <Label>How should the final count?</Label>
                <div className="grid gap-2">
                  {(
                    [
                      {
                        description:
                          "Treat the selected category itself as the final exam score.",
                        icon: Target,
                        label: "Final is its own weighted category",
                        value: "category",
                      },
                      {
                        description:
                          "Add a new 100-point final assignment to the selected category.",
                        icon: TrendingUp,
                        label: "Add final into a category",
                        value: "add-assignment",
                      },
                      {
                        description:
                          "Drop the lowest score in the selected category and use the final score there.",
                        icon: ArrowRightLeft,
                        label: "Replace lowest score with final",
                        value: "replace-lowest",
                      },
                    ] as const
                  ).map((option) => {
                    const Icon = option.icon;
                    const selected = placement === option.value;

                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => setPlacement(option.value)}
                        className={`rounded-2xl border p-4 text-left transition hover:border-primary/60 hover:bg-primary/5 ${
                          selected
                            ? "border-primary bg-primary/10"
                            : "bg-background"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="rounded-xl bg-secondary p-2">
                            <Icon className="size-4" />
                          </span>
                          <span className="space-y-1">
                            <span className="block font-medium">
                              {option.label}
                            </span>
                            <span className="block text-muted-foreground text-sm">
                              {option.description}
                            </span>
                          </span>
                          {selected && (
                            <CheckCircle2 className="ml-auto size-5 text-primary" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {placement === "category" &&
                selectedClass?.gradingMethod === "points" && (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
                    Category-final mode requires weighted categories, but this
                    class uses points. Use one of the assignment options
                    instead.
                  </div>
                )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">
                  Choose calculator direction
                </CardTitle>
                <CardDescription>
                  Toggle between solving for a required final score and
                  projecting your grade from a final score you already know.
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
                          ? `Score needed on the final to reach ${goal || "your goal"}%.`
                          : "Select a class, category, and goal to calculate."
                      : projectedGrade !== null
                        ? `Projected overall grade with a ${finalScore || "0"}% final.`
                        : "Select a class, category, and final score to preview your grade."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Info className="size-5" /> Scenario details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-secondary p-4">
                    <div className="text-muted-foreground">
                      Selected category
                    </div>
                    <div className="mt-1 font-semibold">
                      {selectedSection?.name ?? "None selected"}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-secondary p-4">
                    <div className="text-muted-foreground">Category grade</div>
                    <div className="mt-1 font-semibold">
                      {currentSectionGrade === false
                        ? "No graded work"
                        : formatPercent(currentSectionGrade)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-secondary p-4">
                    <div className="text-muted-foreground">Category weight</div>
                    <div className="mt-1 font-semibold">
                      {selectedSection?.weight === undefined
                        ? "Points based"
                        : formatPercent(selectedSection.weight, 0)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
                  <div>
                    <div className="font-medium">Show possible range</div>
                    <div className="text-muted-foreground">
                      Estimate the class grade at 0% and {FINAL_SEARCH_MAX}% on
                      the final for this setup.
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
