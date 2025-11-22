import { Assignment } from "@/types/report";
import { TableCell, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Check } from "lucide-react";
import { AssignmentRowGrade } from "./assignment-row-grade";

export function AssignmentRow({
  assignment,
  weakPoint,
}: {
  assignment: Assignment;
  weakPoint: boolean;
}) {
  return (
    <TableRow>
      <TableCell className="flex flex-col">
        {assignment.name}
        {assignment.description && (
          <span className="font-sm mt-2 text-muted-foreground wrap-break-word whitespace-break-spaces">
            {assignment.description}
          </span>
        )}
      </TableCell>
      <TableCell>
        {new Date(assignment.due).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </TableCell>
      <TableCell className="font-mono">
        {assignment.status === "valid" ? (
          <AssignmentRowGrade
            points={assignment.points}
            maxPoints={assignment.maxPoints}
          />
        ) : assignment.status === "missing" ? (
          <AssignmentRowGrade points={0} maxPoints={assignment.maxPoints} />
        ) : (
          <></>
        )}
      </TableCell>
      <TableCell>
        {weakPoint && (
          <Badge variant="destructive" className="mr-2">
            Weak point
          </Badge>
        )}
        <Badge
          variant={assignment.status === "missing" ? "destructive" : "outline"}
        >
          {assignment.status === "valid" ? (
            <Check />
          ) : (
            assignment.status[0].toUpperCase() + assignment.status.substring(1)
          )}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
