import { AssignmentCard, AssignmentRow } from "@/components/assignment-row";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  sectionGradePoints,
  sectionGradeUnweighted,
  sectionGradeWeighted,
} from "@/lib/grades";
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
  const weakPoint = (assignment: Section["assignments"][number]) =>
    percentage !== false &&
    (assignment.status === "valid" || assignment.status === "missing") &&
    assignment.maxPoints > 0 &&
    Math.min(
      1,
      (assignment.status === "valid" ? assignment.points : 0) /
        Math.max(1, assignment.maxPoints),
    ) < Math.min(1, percentage);

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
              <span className="font-mono font-semibold">
                {roundTo(points.totalPoints, 2)} /{" "}
                {roundTo(points.possiblePoints, 2)}
              </span>
            </div>
            <div className="grid gap-1">
              <span className="text-muted-foreground">Category grade</span>
              <span className="font-mono font-semibold">
                {percentage === false
                  ? "No graded work"
                  : `${roundTo(percentage * 100, 2)}%`}
              </span>
            </div>
            <div className="col-span-2 grid gap-1 sm:col-span-1">
              <span className="text-muted-foreground">
                {cls.gradingMethod === "points"
                  ? "Share of class points"
                  : "Weight in class grade"}
              </span>
              <span className="font-mono font-semibold">
                {classShare === undefined
                  ? "—"
                  : `${roundTo(classShare * 100, 2)}%`}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {section.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignments yet.</p>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {section.assignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.sourceIndex}
                  assignment={assignment}
                  weakPoint={weakPoint(assignment)}
                  gradingMethod={cls.gradingMethod}
                />
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.assignments.map((assignment) => (
                    <AssignmentRow
                      key={assignment.sourceIndex}
                      weakPoint={weakPoint(assignment)}
                      assignment={assignment}
                      gradingMethod={cls.gradingMethod}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
