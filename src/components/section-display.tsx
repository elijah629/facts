import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sectionGradeUnweighted, sectionGradeWeighted } from "@/lib/grades";
import type { Section, Class } from "@/types/report";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AssignmentRow } from "@/components/assignment-row";
import { cn, roundTo } from "@/lib/utils";
import { ArrowRight, Dot } from "lucide-react";

export function SectionDisplay({
  section,
  cls,
}: {
  section: Section;
  cls: Class;
}) {
  const percentage =
    cls.gradingMethod === "mixed"
      ? sectionGradeWeighted(section, cls.roundingPrecision)
      : sectionGradeUnweighted(section);

  return (
    <Card
      className={cn(
        percentage === false && "hover:bg-muted/50 transition-colors",
      )}
    >
      <CardHeader>
        <div
          className={cn(
            "flex justify-between items-center",
            percentage === false && "justify-center -mb-2",
          )}
        >
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {section.name}
              <ArrowRight size={16} />
              {section.weight && (
                <span className="font-mono"> {section.weight * 100}%</span>
              )}
            </CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </div>
          {percentage !== false && (
            <div className="text-right">
              <div className="font-semibold font-mono">
                {roundTo(percentage * 100, 2)}%
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      {percentage !== false && (
        <CardContent>
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
              {section.assignments.map((assignment, index) => (
                <AssignmentRow
                  key={index}
                  weakPoint={
                    (assignment.status === "valid" ||
                      assignment.status === "missing") &&
                    Math.min(
                      1,
                      (assignment.status === "valid" ? assignment.points : 0) /
                        assignment.maxPoints,
                    ) < Math.min(1, percentage)
                  }
                  assignment={assignment}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}
