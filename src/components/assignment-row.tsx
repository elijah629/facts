import { ChevronDown } from "lucide-react";
import type { Assignment, Class } from "@/types/report";
import { GradePercentage } from "./grade-mark";
import { Badge } from "./ui/badge";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function AssignmentGrade({
  assignment,
  gradingMethod,
}: {
  assignment: Assignment;
  gradingMethod: Class["gradingMethod"];
}) {
  if (assignment.status === "excuse")
    return <Badge variant="outline">Excused</Badge>;

  const points = assignment.status === "missing" ? 0 : assignment.points;
  return (
    <div className="flex flex-col items-end gap-0.5 text-right tabular-nums">
      {assignment.status === "missing" ? (
        <Badge variant="destructive">Missing</Badge>
      ) : assignment.maxPoints > 0 ? (
        <GradePercentage
          percentage={points / assignment.maxPoints}
          className="text-base leading-tight font-semibold"
        />
      ) : (
        <span className="font-semibold">Extra credit</span>
      )}
      <span className="text-xs text-muted-foreground">
        {assignment.maxPoints > 0
          ? `${points} / ${assignment.maxPoints} pts`
          : `${points >= 0 ? "+" : ""}${points}${gradingMethod === "percent" ? "%" : " pts"}`}
      </span>
    </div>
  );
}

export function AssignmentRow({
  assignment,
  gradingMethod,
}: {
  assignment: Assignment;
  gradingMethod: Class["gradingMethod"];
}) {
  const due = new Date(assignment.due);
  const dueLabel = Number.isNaN(due.getTime()) ? "" : dateFormat.format(due);
  const adjustments = [
    ["Curve", assignment.curve],
    ["Bonus", assignment.bonus],
    ["Penalty", assignment.penalty],
  ] as const;
  const hasDetails =
    Boolean(assignment.description?.trim() || assignment.note?.trim()) ||
    adjustments.some(([, value]) => value !== undefined);
  const row = (
    <>
      <div className="min-w-0 space-y-1">
        <p className="wrap-break-word text-sm leading-snug font-medium sm:text-base">
          {assignment.name}
        </p>
        {dueLabel && (
          <p className="text-xs text-muted-foreground">Due {dueLabel}</p>
        )}
      </div>
      <AssignmentGrade assignment={assignment} gradingMethod={gradingMethod} />
    </>
  );

  if (!hasDetails)
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3.5 pr-8">
        {row}
      </div>
    );

  return (
    <details className="group">
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_1rem] items-center gap-3 rounded-sm py-3.5 pr-1 transition-colors hover:bg-muted/45 [&::-webkit-details-marker]:hidden">
        {row}
        <ChevronDown
          className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="mb-3 space-y-3 rounded-lg bg-muted/50 p-3 text-sm sm:p-4">
        {assignment.description?.trim() && (
          <p className="wrap-break-word whitespace-pre-wrap">
            {assignment.description}
          </p>
        )}
        {assignment.note?.trim() && (
          <div>
            <p className="font-medium">Teacher note</p>
            <p className="wrap-break-word whitespace-pre-wrap text-muted-foreground">
              {assignment.note}
            </p>
          </div>
        )}
        {adjustments.some(([, value]) => value !== undefined) && (
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            {adjustments.map(([label, value]) =>
              value === undefined ? null : (
                <div key={label} className="flex gap-1">
                  <dt>{label}</dt>
                  <dd className="tabular-nums">{value}</dd>
                </div>
              ),
            )}
          </dl>
        )}
      </div>
    </details>
  );
}
