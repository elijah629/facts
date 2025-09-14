import { Assignment } from "@/types/report";
import { TableCell, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { formatDate } from "@/lib/utils";

export function AssignmentRow({
  assignment,
  weakPoint,
}: {
  assignment: Assignment;
  weakPoint: boolean;
}) {
  return (
    <TableRow>
      <TableCell className="break-words whitespace-break-spaces flex flex-col">
        {assignment.name}
        {assignment.description && (
          <span className="font-sm mt-2 text-muted-foreground">
            {assignment.description}
          </span>
        )}
      </TableCell>
      <TableCell>{formatDate(assignment.due)}</TableCell>
      {assignment.status === "valid" ? (
        <>
          <TableCell>
            {assignment.points}/{assignment.maxPoints}
          </TableCell>
          <TableCell>
            {((assignment.points * 100) / assignment.maxPoints).toFixed(3)}%
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
        {weakPoint && (
          <span className="text-sm text-destructive">Weak point</span>
        )}
      </TableCell>
      <TableCell>
        <Badge
          variant={assignment.status === "missing" ? "destructive" : "outline"}
        >
          {assignment.status[0].toUpperCase() + assignment.status.substring(1)}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
