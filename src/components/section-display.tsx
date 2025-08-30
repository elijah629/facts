import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Section } from "@/types/report";
import { sectionGrade } from "@/lib/grades";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

export function SectionDisplay({ section }: { section: Section }) {
  const percentage = sectionGrade(section);

  if (percentage === false) {
    return <></>;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">{section.name}</CardTitle>
            <CardDescription>
              {section.description} Weight: {section.weight * 100}%
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="font-semibold">{percentage.toFixed(3)}%</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {section.assignments.map((assignment, index) => (
              <TableRow key={index}>
                <TableCell className="break-words whitespace-break-spaces flex flex-col">
                  {assignment.name}
                  {assignment.description && (
                    <span className="font-sm mt-2 text-muted-foreground">
                      {assignment.description}
                    </span>
                  )}
                </TableCell>
                <TableCell>{assignment.due}</TableCell>
                {assignment.status === "valid" ? (
                  <>
                    <TableCell>
                      {assignment.points}/{assignment.maxPoints}
                    </TableCell>
                    <TableCell>
                      {(
                        (assignment.points * 100) /
                        assignment.maxPoints
                      ).toFixed(3)}
                      %
                    </TableCell>
                  </>
                ) : assignment.status === "missing" ? (
                  <>
                    <TableCell>0/{assignment.maxPoints}</TableCell>
                    <TableCell>0%</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </>
                )}
                <TableCell>
                  {(assignment.status === "valid" ||
                    assignment.status === "missing") &&
                    Math.min(
                      100,
                      ((assignment.status === "valid" ? assignment.points : 0) *
                        100) /
                        assignment.maxPoints,
                    ) < Math.min(100, percentage) && (
                      <span className="text-sm text-destructive">
                        Weak point
                      </span>
                    )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      assignment.status === "missing"
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {assignment.status[0].toUpperCase() +
                      assignment.status.substring(1)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
