import { Check } from "lucide-react";
import type { Assignment, Class } from "@/types/report";
import { AssignmentRowGrade } from "./assignment-row-grade";
import { Badge } from "./ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { TableCell, TableRow } from "./ui/table";

function dueDate(assignment: Assignment) {
  return new Date(assignment.due).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function AssignmentGrade({
  assignment,
  gradingMethod,
}: {
  assignment: Assignment;
  gradingMethod: Class["gradingMethod"];
}) {
  if (assignment.status === "valid") {
    return (
      <AssignmentRowGrade
        points={assignment.points}
        maxPoints={assignment.maxPoints}
        gradingMethod={gradingMethod}
      />
    );
  }

  if (assignment.status === "missing") {
    return (
      <AssignmentRowGrade
        points={0}
        maxPoints={assignment.maxPoints}
        gradingMethod={gradingMethod}
      />
    );
  }

  return <>—</>;
}

function AssignmentStatus({
  assignment,
  weakPoint,
}: {
  assignment: Assignment;
  weakPoint: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {weakPoint && <Badge variant="destructive">Weak point</Badge>}
      <Badge
        variant={assignment.status === "missing" ? "destructive" : "outline"}
      >
        {assignment.status === "valid" ? (
          <>
            <Check data-icon="inline-start" /> Graded
          </>
        ) : (
          assignment.status[0].toUpperCase() + assignment.status.substring(1)
        )}
      </Badge>
    </div>
  );
}

export function AssignmentRow({
  assignment,
  weakPoint,
  gradingMethod,
}: {
  assignment: Assignment;
  weakPoint: boolean;
  gradingMethod: Class["gradingMethod"];
}) {
  return (
    <TableRow>
      <TableCell className="min-w-72 whitespace-normal">
        <div className="flex flex-col gap-2">
          <span className="font-medium">{assignment.name}</span>
          {assignment.description && (
            <span className="wrap-break-word whitespace-break-spaces text-sm text-muted-foreground">
              {assignment.description}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">{dueDate(assignment)}</TableCell>
      <TableCell className="whitespace-nowrap font-mono">
        <AssignmentGrade
          assignment={assignment}
          gradingMethod={gradingMethod}
        />
      </TableCell>
      <TableCell>
        <AssignmentStatus assignment={assignment} weakPoint={weakPoint} />
      </TableCell>
    </TableRow>
  );
}

export function AssignmentCard({
  assignment,
  weakPoint,
  gradingMethod,
}: {
  assignment: Assignment;
  weakPoint: boolean;
  gradingMethod: Class["gradingMethod"];
}) {
  return (
    <Card className="gap-4 py-4 shadow-none">
      <CardHeader className="gap-2 px-4">
        <CardTitle className="text-base leading-snug">
          {assignment.name}
        </CardTitle>
        {assignment.description && (
          <CardDescription className="wrap-break-word whitespace-break-spaces">
            {assignment.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 px-4 text-sm">
        <div className="grid min-w-0 gap-1">
          <span className="text-muted-foreground">Due</span>
          <span>{dueDate(assignment)}</span>
        </div>
        <div className="grid min-w-0 gap-1">
          <span className="text-muted-foreground">Grade</span>
          <span className="font-mono">
            <AssignmentGrade
              assignment={assignment}
              gradingMethod={gradingMethod}
            />
          </span>
        </div>
        <div className="col-span-2 grid gap-2">
          <span className="text-muted-foreground">Status</span>
          <AssignmentStatus assignment={assignment} weakPoint={weakPoint} />
        </div>
      </CardContent>
    </Card>
  );
}
