"use client";

import {
  ArrowRightLeft,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  GraduationCap,
  Info,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
type FinalScenario = "final-only" | "final-plus-replace";

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

function findFinalSectionIndex(cls: Class): number | undefined {
  const index = cls.sections.findIndex((section) =>
    section.name.toLowerCase().includes("final"),
  );

  return index === -1 ? undefined : index;
}

function findLowestAssignment(
  cls: Class | undefined,
  sectionIndex: number | undefined,
): { assignment: Assignment; index: number; percent: number } | null {
  const section =
    cls && sectionIndex !== undefined ? cls.sections[sectionIndex] : undefined;

  if (!section) {
    return null;
  }

  return section.assignments.reduce<{
    assignment: Assignment;
    index: number;
    percent: number;
  } | null>((currentLowest, assignment, index) => {
    const percent = assignmentPercent(assignment);

    if (percent === null) {
      return currentLowest;
    }

    if (!currentLowest || percent < currentLowest.percent) {
      return { assignment, index, percent };
    }

    return currentLowest;
  }, null);
}

function finalAssignmentFromExisting(
  assignment: Assignment,
  finalPercent: number,
): Assignment {
  const maxPoints =
    assignment.status === "valid" || assignment.status === "missing"
      ? assignment.maxPoints
      : 100;

  return {
    due: assignment.due,
    maxPoints,
    name: `${assignment.name} (replaced by final)`,
    points: finalPercent * maxPoints,
    status: "valid",
  };
}

function cloneClassWithImprovedLowestScore(
  cls: Class,
  sectionIndex: number | undefined,
  finalPercent: number,
): Class {
  const lowest = findLowestAssignment(cls, sectionIndex);

  if (sectionIndex === undefined || !lowest || finalPercent <= lowest.percent) {
    return cls;
  }

  const sections = cls.sections.map((section, currentIndex) => {
    if (currentIndex !== sectionIndex) {
      return section;
    }

    const assignments = section.assignments.map(
      (assignment, assignmentIndex) =>
        assignmentIndex === lowest.index
          ? finalAssignmentFromExisting(assignment, finalPercent)
          : assignment,
    );

    return { ...section, assignments };
  });

  return { ...cls, sections };
}

function gradeWithFinalCategory(
  cls: Class,
  finalSectionIndex: number,
  finalPercent: number,
  replaceSectionIndex: number | undefined,
): number | null {
  if (cls.gradingMethod === "points") {
    return null;
  }

  const classWithReplacement = cloneClassWithImprovedLowestScore(
    cls,
    replaceSectionIndex,
    finalPercent,
  );
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [index, section] of classWithReplacement.sections.entries()) {
    const grade =
      index === finalSectionIndex
        ? finalPercent
        : selectedSectionGrade(classWithReplacement, index);

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
  replaceSectionIndex: number | undefined,
  targetPercent: number,
): { score: number | null; minGrade: number | null; maxGrade: number | null } {
  const minGrade = gradeWithFinalCategory(cls, finalSectionIndex, 0, undefined);
  const maxGrade = gradeWithFinalCategory(
    cls,
    finalSectionIndex,
    FINAL_SEARCH_MAX / 100,
    replaceSectionIndex,
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
      replaceSectionIndex,
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
  const [classIndex, setClassIndex] = useState<string | undefined>(undefined);
  const [finalSectionSelections, setFinalSectionSelections] = useState<
    Record<string, string>
  >({});
  const [replaceSectionSelections, setReplaceSectionSelections] = useState<
    Record<string, string>
  >({});
  const [mode, setMode] = useState<CalculatorMode>("required");
  const [scenario, setScenario] = useState<FinalScenario>("final-only");
  const [goal, setGoal] = useState<string>("90");
  const [finalScore, setFinalScore] = useState<string>("85");
  const [showWhatIfRange, setShowWhatIfRange] = useState(true);

  const selectedClass = useSelectedClass(report?.classes ?? [], classIndex);
  const classKey = selectedClass?.fullName ?? classIndex;
  const finalSectionIndex = classKey
    ? finalSectionSelections[classKey]
    : undefined;
  const replaceSectionIndex = classKey
    ? replaceSectionSelections[classKey]
    : undefined;
  const selectedFinalSection =
    selectedClass && finalSectionIndex !== undefined
      ? selectedClass.sections[Number(finalSectionIndex)]
      : undefined;
  const selectedReplaceSection =
    selectedClass && replaceSectionIndex !== undefined
      ? selectedClass.sections[Number(replaceSectionIndex)]
      : undefined;
  const activeReplaceSectionIndex =
    scenario === "final-plus-replace" &&
    replaceSectionIndex !== undefined &&
    replaceSectionIndex !== finalSectionIndex
      ? Number(replaceSectionIndex)
      : undefined;
  const currentGrade = selectedClass ? classGrade(selectedClass) : null;
  const currentFinalSectionGrade =
    selectedClass && finalSectionIndex !== undefined
      ? selectedSectionGrade(selectedClass, Number(finalSectionIndex))
      : false;
  const lowestAssignment = findLowestAssignment(
    selectedClass,
    activeReplaceSectionIndex,
  );

  useEffect(() => {
    if (!selectedClass || !classKey) {
      return;
    }

    const savedFinalIndex = finalSectionSelections[classKey];

    if (
      savedFinalIndex !== undefined &&
      selectedClass.sections[Number(savedFinalIndex)]
    ) {
      return;
    }

    const automaticFinalIndex = findFinalSectionIndex(selectedClass) ?? 0;

    setFinalSectionSelections((selections) => ({
      ...selections,
      [classKey]: automaticFinalIndex.toString(),
    }));
  }, [classKey, finalSectionSelections, selectedClass]);

  useEffect(() => {
    if (!selectedClass || !classKey) {
      return;
    }

    const savedReplaceIndex = replaceSectionSelections[classKey];

    if (
      savedReplaceIndex !== undefined &&
      selectedClass.sections[Number(savedReplaceIndex)] &&
      savedReplaceIndex !== finalSectionIndex
    ) {
      return;
    }

    const firstNonFinalIndex = selectedClass.sections.findIndex(
      (_section, index) => index.toString() !== finalSectionIndex,
    );

    if (firstNonFinalIndex === -1) {
      return;
    }

    setReplaceSectionSelections((selections) => ({
      ...selections,
      [classKey]: firstNonFinalIndex.toString(),
    }));
  }, [classKey, finalSectionIndex, replaceSectionSelections, selectedClass]);

  const targetPercent = parsePercent(goal);
  const finalPercent = parsePercent(finalScore);
  const projectedGrade =
    selectedClass && finalSectionIndex !== undefined && finalPercent !== null
      ? gradeWithFinalCategory(
          selectedClass,
          Number(finalSectionIndex),
          finalPercent,
          activeReplaceSectionIndex,
        )
      : null;
  const requiredResult =
    selectedClass && finalSectionIndex !== undefined && targetPercent !== null
      ? requiredFinalScore(
          selectedClass,
          Number(finalSectionIndex),
          activeReplaceSectionIndex,
          targetPercent,
        )
      : null;
  const replacementWillApply =
    scenario === "final-plus-replace" &&
    lowestAssignment !== null &&
    finalPercent !== null &&
    finalPercent > lowestAssignment.percent;

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
          <div className="grid gap-5 md:grid-cols-[1.35fr_0.65fr] md:items-end">
            <div className="space-y-3">
              <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
                Final grade calculator
              </h1>
              <p className="max-w-2xl text-muted-foreground text-lg">
                Pick the final exam category, then optionally let a higher final
                score replace the lowest assignment in another category.
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
                {selectedClass?.displayName ?? "Pick a class"}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Calculator className="size-6" /> Setup
              </CardTitle>
              <CardDescription>
                Finals are modeled as a weighted final category, not as a new
                points-based assignment in that category.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-2">
                <Label>Class</Label>
                <Select value={classIndex} onValueChange={setClassIndex}>
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
                <Label>Final category</Label>
                <Select
                  disabled={!selectedClass || !classKey}
                  value={finalSectionIndex}
                  onValueChange={(value) => {
                    if (!classKey) {
                      return;
                    }

                    setFinalSectionSelections((selections) => ({
                      ...selections,
                      [classKey]: value,
                    }));
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

              <div className="grid gap-2">
                <Label>Scenario</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      {
                        description: "Use only the selected final category.",
                        icon: Target,
                        label: "Final category only",
                        value: "final-only",
                      },
                      {
                        description:
                          "Also replace the lowest score in another category when the final is higher.",
                        icon: ArrowRightLeft,
                        label: "Final + replace lowest",
                        value: "final-plus-replace",
                      },
                    ] as const
                  ).map((option) => {
                    const Icon = option.icon;
                    const selected = scenario === option.value;

                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => setScenario(option.value)}
                        className={`rounded-2xl border p-4 text-left transition hover:border-primary/60 hover:bg-primary/5 ${
                          selected
                            ? "border-primary bg-primary/10"
                            : "bg-background"
                        }`}
                      >
                        <div className="flex gap-3">
                          <Icon className="mt-0.5 size-4 shrink-0" />
                          <span className="space-y-1">
                            <span className="flex items-center gap-2 font-medium">
                              {option.label}
                              {selected && (
                                <CheckCircle2 className="size-4 text-primary" />
                              )}
                            </span>
                            <span className="block text-muted-foreground text-sm">
                              {option.description}
                            </span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {scenario === "final-plus-replace" && (
                <div className="grid gap-2 rounded-2xl border bg-background/60 p-4">
                  <Label>Category to improve</Label>
                  <Select
                    disabled={!selectedClass || !classKey}
                    value={replaceSectionIndex}
                    onValueChange={(value) => {
                      if (!classKey) {
                        return;
                      }

                      setReplaceSectionSelections((selections) => ({
                        ...selections,
                        [classKey]: value,
                      }));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Categories</SelectLabel>
                        {selectedClass?.sections
                          .map((section, index) => ({ index, section }))
                          .filter(
                            ({ index }) =>
                              index.toString() !== finalSectionIndex,
                          )
                          .map(({ index, section }) => (
                            <SelectItem
                              key={section.name}
                              value={index.toString()}
                            >
                              <BookOpenCheck className="size-4" />
                              {section.name}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-sm">
                    The lowest score is replaced only when the final percentage
                    is higher than that score.
                  </p>
                </div>
              )}

              {selectedClass?.gradingMethod === "points" && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
                  This calculator needs weighted categories. The selected class
                  uses points-based grading.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Calculate</CardTitle>
                <CardDescription>
                  Solve for the required final score or preview a score you
                  already have.
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
                          : "Select a class, final category, and goal to calculate."
                      : projectedGrade !== null
                        ? `Projected overall grade with a ${finalScore || "0"}% final.`
                        : "Select a class, final category, and final score to preview your grade."}
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-secondary p-4">
                    <div className="text-muted-foreground">Final category</div>
                    <div className="mt-1 font-semibold">
                      {selectedFinalSection?.name ?? "None selected"}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-secondary p-4">
                    <div className="text-muted-foreground">
                      Current final category grade
                    </div>
                    <div className="mt-1 font-semibold">
                      {currentFinalSectionGrade === false
                        ? "No graded work"
                        : formatPercent(currentFinalSectionGrade)}
                    </div>
                  </div>
                </div>

                {scenario === "final-plus-replace" && (
                  <div className="rounded-2xl border p-4">
                    <div className="font-medium">
                      {selectedReplaceSection?.name ??
                        "No replacement category selected"}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {lowestAssignment
                        ? `Lowest score: ${lowestAssignment.assignment.name} (${formatPercent(
                            lowestAssignment.percent,
                          )}). ${
                            replacementWillApply
                              ? "The entered final score is higher, so it will replace this score."
                              : "The final score must be higher to replace it."
                          }`
                        : "No eligible graded assignments found to replace."}
                    </div>
                  </div>
                )}

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
