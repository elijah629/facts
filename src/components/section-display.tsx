import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sectionGrade, sectionAverage } from "@/lib/grades";
import type { Section, Class } from "@/types/report";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AssignmentRow } from "@/components/assignment-row";

export function SectionDisplay({ section, cls }: { section: Section, cls: Class }) {
  const percentage = cls.gradingMethod === "mixed" ? sectionGrade(section) : sectionAverage(section);

  if (percentage === false) {
    return;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">
              {section.name}
              {section.weight && <> ({section.weight * 100}%)</>}
            </CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </div>
          <div className="text-right">
            <div className="font-semibold">
              {(percentage * 100).toFixed(3)}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Percent</TableHead>
              <TableHead></TableHead>
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
    </Card>
  );
}
