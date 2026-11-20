import { AssignmentRow } from "@/components/assignment-row";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  sectionGradePoints,
  sectionGradeUnweighted,
  sectionGradeWeighted,
} from "@/lib/grades";
import { formatGrade } from "@/lib/grades/display";
import { roundTo } from "@/lib/utils";
import type { Class, Section } from "@/types/report";

export function SectionDisplay({
  section,
  cls,
}: {
  section: Section;
  cls: Class;
}) {
  const points = sectionGradePoints(section);
  const classPoints = cls.sections.reduce(
    (totals, currentSection) => {
      const current = sectionGradePoints(currentSection);

      return {
        possiblePoints: totals.possiblePoints + current.possiblePoints,
        totalPoints: totals.totalPoints + current.totalPoints,
      };
    },
    { possiblePoints: 0, totalPoints: 0 },
  );
  const percentage =
    cls.gradingMethod === "points"
      ? points.possiblePoints > 0
        ? points.totalPoints / points.possiblePoints
        : false
      : cls.gradingMethod === "mixed"
        ? sectionGradeWeighted(section, cls.roundingPrecision)
        : sectionGradeUnweighted(section);
  const classShare =
    cls.gradingMethod === "points" && classPoints.possiblePoints > 0
      ? points.possiblePoints / classPoints.possiblePoints
      : section.weight;

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <CardTitle className="wrap-break-word text-lg leading-snug">
              {section.name}
            </CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </div>
          <div className="grid w-full grid-cols-2 gap-x-4 gap-y-3 text-sm sm:w-auto sm:shrink-0 sm:grid-cols-3 sm:gap-x-6 sm:text-right">
            <div className="grid gap-1">
              <span className="text-muted-foreground">Category points</span>
              <span className="tabular-nums font-semibold">
                {roundTo(points.totalPoints, 2)} /{" "}
                {roundTo(points.possiblePoints, 2)}
              </span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground">Category grade</span>
              <span className="tabular-nums font-semibold">
                {percentage === false
                  ? "No graded work"
                  : formatGrade(percentage)}
              </span>
            </div>
            <div className="col-span-2 grid gap-1 sm:col-span-1">
              <span className="text-muted-foreground">
                {cls.gradingMethod === "points"
                  ? "Share of class points"
                  : "Weight in class grade"}
              </span>
              <span className="tabular-nums font-semibold">
                {classShare === undefined ? "—" : formatGrade(classShare)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {section.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignments yet.</p>
        ) : (
          <ul className="divide-y">
            {section.assignments.map((assignment) => (
              <li key={assignment.sourceIndex}>
                <AssignmentRow
                  assignment={assignment}
                  gradingMethod={cls.gradingMethod}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
