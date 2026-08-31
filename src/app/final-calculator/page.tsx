"use client";

import {
  ArrowRightLeft,
  BookOpenCheck,
  Calculator,
  GraduationCap,
  Info,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GradingMethodHelp } from "@/components/grading-method-help";
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
  FINAL_SEARCH_MAX,
  findFinalSectionIndex,
  findLowestAssignment,
  gradeWithFinal,
  requiredFinalScore,
  sectionGradeForClass,
} from "@/lib/final-calculator";
import { classGrade, sectionGradePoints } from "@/lib/grades";
import { useReport } from "@/lib/report/store";

type CalculatorMode = "required" | "projected";
type FinalScenario = "final-only" | "final-plus-replace";

function parsePercent(value: string, max = FINAL_SEARCH_MAX): number | null {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 && parsed <= max
    ? parsed / 100
    : null;
}

function parsePositiveNumber(value: string): number | null {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export default function FinalCalculator() {
  const report = useReport((state) => state.report);
  const [classIndex, setClassIndex] = useState("");
  const [finalSectionIndex, setFinalSectionIndex] = useState("");
  const [replaceSectionIndex, setReplaceSectionIndex] = useState("");
  const [mode, setMode] = useState<CalculatorMode>("required");
  const [scenario, setScenario] = useState<FinalScenario>("final-only");
  const [goal, setGoal] = useState("90");
  const [finalScore, setFinalScore] = useState("85");
  const [finalPossiblePoints, setFinalPossiblePoints] = useState("100");
  const [showWhatIfRange, setShowWhatIfRange] = useState(true);

  const selectedClass = useMemo(
    () => (classIndex === "" ? undefined : report?.classes[Number(classIndex)]),
    [classIndex, report],
  );
  const finalIndex =
    finalSectionIndex === "" ? undefined : Number(finalSectionIndex);
  const replaceIndex =
    replaceSectionIndex === "" ? undefined : Number(replaceSectionIndex);
  const activeReplaceIndex =
    scenario === "final-plus-replace" && replaceIndex !== finalIndex
      ? replaceIndex
      : undefined;

  useEffect(() => {
    if (classIndex === "" && report?.classes.length) {
      setClassIndex("0");
    }
  }, [classIndex, report]);

  useEffect(() => {
    if (!selectedClass) {
      setFinalSectionIndex("");
      setReplaceSectionIndex("");
      return;
    }

    const nextFinalIndex = findFinalSectionIndex(selectedClass);
    setFinalSectionIndex(nextFinalIndex.toString());

    const nextReplaceIndex = selectedClass.sections.findIndex(
      (_section, index) => index !== nextFinalIndex,
    );
    setReplaceSectionIndex(
      nextReplaceIndex === -1 ? "" : nextReplaceIndex.toString(),
    );
  }, [selectedClass]);

  const targetPercent = parsePercent(goal, 150);
  const enteredFinalPercent = parsePercent(finalScore);
  const enteredFinalPoints = parsePositiveNumber(finalPossiblePoints);
  const effectiveFinalPoints =
    selectedClass?.gradingMethod === "percent" ? 100 : enteredFinalPoints;
  const projectionOptions =
    finalIndex !== undefined && effectiveFinalPoints !== null
      ? {
          finalPossiblePoints: effectiveFinalPoints,
          finalSectionIndex: finalIndex,
          replaceSectionIndex: activeReplaceIndex,
        }
      : null;
  const projectedGrade =
    selectedClass && projectionOptions && enteredFinalPercent !== null
      ? gradeWithFinal(selectedClass, {
          ...projectionOptions,
          finalPercent: enteredFinalPercent,
        })
      : null;
  const requiredResult =
    selectedClass && projectionOptions && targetPercent !== null
      ? requiredFinalScore(selectedClass, {
          ...projectionOptions,
          targetPercent,
        })
      : null;
  const currentGradeValue = selectedClass ? classGrade(selectedClass) : null;
  const currentGrade =
    currentGradeValue !== null && Number.isFinite(currentGradeValue)
      ? currentGradeValue
      : null;
  const currentFinalSectionGrade =
    selectedClass && finalIndex !== undefined
      ? sectionGradeForClass(selectedClass, finalIndex)
      : false;
  const selectedFinalSection =
    selectedClass && finalIndex !== undefined
      ? selectedClass.sections[finalIndex]
      : undefined;
  const selectedFinalPoints = selectedFinalSection
    ? sectionGradePoints(selectedFinalSection)
    : null;
  const selectedReplaceSection =
    selectedClass && activeReplaceIndex !== undefined
      ? selectedClass.sections[activeReplaceIndex]
      : undefined;
  const lowestAssignment = findLowestAssignment(
    selectedClass,
    activeReplaceIndex,
  );
  const replacementWillApply =
    lowestAssignment !== null &&
    enteredFinalPercent !== null &&
    enteredFinalPercent > lowestAssignment.percent;
  const minProjection =
    selectedClass && projectionOptions
      ? gradeWithFinal(selectedClass, {
          ...projectionOptions,
          finalPercent: 0,
        })
      : null;
  const maxProjection =
    selectedClass && projectionOptions
      ? gradeWithFinal(selectedClass, {
          ...projectionOptions,
          finalPercent: FINAL_SEARCH_MAX / 100,
        })
      : null;

  if (!report) {
    return (
      <Card className="mx-auto max-w-xl border-dashed text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Load a report first</CardTitle>
          <CardDescription>
            The final calculator uses the grading method, categories, points,
            and assignments from your report.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <Card>
        <CardHeader className="gap-4 md:grid md:grid-cols-[1fr_auto] md:items-end">
          <div className="grid gap-3">
            <CardTitle className="text-balance text-3xl md:text-4xl">
              Final grade calculator
            </CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Add a what-if final assignment to any category. The calculator
              uses the same POINTS, MIXED, or PERCENT rules as the report.
            </CardDescription>
          </div>
          <div className="grid gap-1 md:text-right">
            <span className="flex items-center gap-2 text-sm text-muted-foreground md:justify-end">
              <GraduationCap /> Current grade
            </span>
            <span className="text-3xl font-bold">
              {currentGrade === null
                ? "—"
                : formatPercent(
                    currentGrade,
                    selectedClass?.roundingPrecision ?? 2,
                  )}
            </span>
            <span className="text-sm text-muted-foreground">
              {selectedClass?.displayName ?? "Pick a class"}
            </span>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Calculator /> Setup
            </CardTitle>
            <CardDescription>
              Choose where the final belongs and how your teacher will use it.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="calculator-class">Class</Label>
              <Select value={classIndex} onValueChange={setClassIndex}>
                <SelectTrigger id="calculator-class" className="w-full">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Classes</SelectLabel>
                    {report.classes.map((cls, index) => (
                      <SelectItem key={cls.fullName} value={index.toString()}>
                        <GraduationCap /> {cls.displayName}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {selectedClass && (
                <GradingMethodHelp method={selectedClass.gradingMethod} />
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="final-category">Final category</Label>
              <Select
                value={finalSectionIndex}
                onValueChange={setFinalSectionIndex}
                disabled={!selectedClass}
              >
                <SelectTrigger id="final-category" className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Categories</SelectLabel>
                    {selectedClass?.sections.map((section, index) => (
                      <SelectItem
                        key={`${section.name}-${section.description ?? ""}-${section.weight ?? "points"}`}
                        value={index.toString()}
                      >
                        <BookOpenCheck /> {section.name}
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
              <p className="text-sm text-muted-foreground">
                The what-if final is added beside any assignments already in
                this category.
              </p>
            </div>

            {(selectedClass?.gradingMethod === "points" ||
              selectedClass?.gradingMethod === "mixed") && (
              <div className="grid gap-2">
                <Label htmlFor="final-points">Final possible points</Label>
                <Input
                  id="final-points"
                  type="number"
                  min={0.01}
                  step={0.1}
                  value={finalPossiblePoints}
                  onChange={(event) =>
                    setFinalPossiblePoints(event.target.value)
                  }
                  aria-invalid={enteredFinalPoints === null}
                />
                <p className="text-sm text-muted-foreground">
                  Point value matters in{" "}
                  {selectedClass.gradingMethod.toUpperCase()} classes. Use the
                  possible score printed on the final or syllabus.
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="final-scenario">Scenario</Label>
              <Select
                value={scenario}
                onValueChange={(value) => setScenario(value as FinalScenario)}
              >
                <SelectTrigger id="final-scenario" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="final-only">
                    <Target /> Add final only
                  </SelectItem>
                  <SelectItem value="final-plus-replace">
                    <ArrowRightLeft /> Add final + replace lowest
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {scenario === "final-only"
                  ? "Only the new final assignment changes the grade."
                  : "If the final percentage is higher, it also replaces the lowest assignment in the category below while keeping that assignment's original point value."}
              </p>
            </div>

            {scenario === "final-plus-replace" && (
              <div className="grid gap-2">
                <Label htmlFor="replace-category">Category to improve</Label>
                <Select
                  value={replaceSectionIndex}
                  onValueChange={setReplaceSectionIndex}
                  disabled={!selectedClass}
                >
                  <SelectTrigger id="replace-category" className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Categories</SelectLabel>
                      {selectedClass?.sections
                        .map((section, index) => ({ index, section }))
                        .filter(({ index }) => index !== finalIndex)
                        .map(({ index, section }) => (
                          <SelectItem
                            key={`${section.name}-${section.description ?? ""}-${section.weight ?? "points"}`}
                            value={index.toString()}
                          >
                            <BookOpenCheck /> {section.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid content-start gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Calculate</CardTitle>
              <CardDescription>
                Solve for the score you need or preview a score you expect.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="calculator-mode">Calculation</Label>
                <Select
                  value={mode}
                  onValueChange={(value) => setMode(value as CalculatorMode)}
                >
                  <SelectTrigger id="calculator-mode" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="required">
                      Score needed on final
                    </SelectItem>
                    <SelectItem value="projected">Grade after final</SelectItem>
                  </SelectContent>
                </Select>
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
                    aria-invalid={targetPercent === null}
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="final-score">Expected final score (%)</Label>
                  <Input
                    id="final-score"
                    type="number"
                    min={0}
                    max={FINAL_SEARCH_MAX}
                    step={0.1}
                    value={finalScore}
                    onChange={(event) => setFinalScore(event.target.value)}
                    aria-invalid={enteredFinalPercent === null}
                  />
                </div>
              )}

              <Card className="bg-secondary shadow-none">
                <CardHeader>
                  <CardDescription>Result</CardDescription>
                  <CardTitle className="text-4xl">
                    {mode === "required"
                      ? requiredResult?.score === null
                        ? "Not reachable"
                        : requiredResult
                          ? `${requiredResult.score.toFixed(2)}%`
                          : "—"
                      : projectedGrade === null
                        ? "—"
                        : formatPercent(projectedGrade)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {mode === "required"
                    ? requiredResult?.score === null &&
                      requiredResult.maxGrade !== null
                      ? `Even a ${FINAL_SEARCH_MAX}% final projects to ${formatPercent(requiredResult.maxGrade)}.`
                      : requiredResult
                        ? `Final score needed to reach ${goal}% overall.`
                        : "Choose valid settings and a goal to calculate."
                    : projectedGrade !== null
                      ? `Overall grade after adding a ${finalScore}% final.`
                      : "Choose valid settings and an expected score to preview the result."}
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Info /> Scenario details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1 rounded-lg border p-4">
                  <dt className="text-muted-foreground">Final category</dt>
                  <dd className="font-semibold">
                    {selectedFinalSection?.name ?? "None selected"}
                  </dd>
                </div>
                <div className="grid gap-1 rounded-lg border p-4">
                  <dt className="text-muted-foreground">Current category</dt>
                  <dd className="font-semibold">
                    {currentFinalSectionGrade === false
                      ? "No graded work"
                      : `${formatPercent(
                          currentFinalSectionGrade,
                          selectedClass?.roundingPrecision ?? 2,
                        )} · ${selectedFinalPoints?.totalPoints ?? 0} / ${selectedFinalPoints?.possiblePoints ?? 0} pts`}
                  </dd>
                </div>
              </dl>

              {scenario === "final-plus-replace" && (
                <div className="grid gap-1 rounded-lg border p-4">
                  <span className="font-medium">
                    {selectedReplaceSection?.name ??
                      "No replacement category selected"}
                  </span>
                  <span className="text-muted-foreground">
                    {lowestAssignment
                      ? `Lowest: ${lowestAssignment.assignment.name} (${formatPercent(lowestAssignment.percent)}). ${
                          mode === "projected"
                            ? replacementWillApply
                              ? "The expected final is higher, so replacement applies."
                              : "The expected final is not higher, so replacement does not apply."
                            : "The required-score calculation applies replacement only once the final becomes higher."
                        }`
                      : "No eligible assignment can be replaced."}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="grid gap-1">
                  <Label htmlFor="show-range">Show possible range</Label>
                  <span className="text-muted-foreground">
                    Overall grade at 0% and {FINAL_SEARCH_MAX}% on the final.
                  </span>
                </div>
                <Switch
                  id="show-range"
                  checked={showWhatIfRange}
                  onCheckedChange={setShowWhatIfRange}
                />
              </div>

              {showWhatIfRange && (
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1 rounded-lg border p-4">
                    <dt className="text-muted-foreground">Final at 0%</dt>
                    <dd className="text-2xl font-semibold">
                      {minProjection === null
                        ? "—"
                        : formatPercent(minProjection)}
                    </dd>
                  </div>
                  <div className="grid gap-1 rounded-lg border p-4">
                    <dt className="text-muted-foreground">
                      Final at {FINAL_SEARCH_MAX}%
                    </dt>
                    <dd className="text-2xl font-semibold">
                      {maxProjection === null
                        ? "—"
                        : formatPercent(maxProjection)}
                    </dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
