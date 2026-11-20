import { AssignmentRow } from "@/components/assignment-row";
import { GradePercentage } from "@/components/grade-mark";
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
    <Card className="gap-3 py-4 sm:py-5">
      <CardHeader className="gap-2 px-4 sm:px-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <CardTitle className="min-w-0 wrap-break-word text-lg leading-snug">
            {section.name}
          </CardTitle>
          {percentage === false ? (
            <span className="text-sm text-muted-foreground">
              No graded work
            </span>
          ) : (
            <GradePercentage
              percentage={percentage}
              className="text-lg font-semibold"
            />
          )}
        </div>
        {section.description && (
          <CardDescription>{section.description}</CardDescription>
        )}
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <div className="flex gap-1.5">
            <dt>Points</dt>
            <dd className="font-medium text-foreground tabular-nums">
              {roundTo(points.totalPoints, 2)} /{" "}
              {roundTo(points.possiblePoints, 2)}
            </dd>
          </div>
          {classShare !== undefined && (
            <div className="flex gap-1.5">
              <dt>
                {cls.gradingMethod === "points"
                  ? "Share of class points"
                  : "Weight"}
              </dt>
              <dd className="font-medium text-foreground tabular-nums">
                {formatGrade(classShare)}
              </dd>
            </div>
          )}
        </dl>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {section.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignments yet.</p>
        ) : (
          <ul className="divide-y border-t">
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
