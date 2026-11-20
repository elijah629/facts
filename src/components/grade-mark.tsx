import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { letterGrade } from "@/lib/grades";
import { formatGrade, formatGradeChange } from "@/lib/grades/display";
import { cn } from "@/lib/utils";

export function GradeMark({
  percentage,
  compact = false,
}: {
  percentage: number | null;
  compact?: boolean;
}) {
  if (percentage === null || !Number.isFinite(percentage)) {
    return <span className="text-sm text-muted-foreground">Ungraded</span>;
  }
  const letter = letterGrade(percentage);
  const tone =
    percentage >= 0.9
      ? "bg-grade-up/12 text-grade-up"
      : percentage < 0.7
        ? "bg-grade-down/12 text-grade-down"
        : "bg-muted text-foreground";
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 tabular-nums">
      <span
        className={cn(
          "rounded px-1.5 py-0.5 font-semibold",
          compact ? "text-[0.65rem]" : "text-xs",
          tone,
        )}
      >
        {letter}
      </span>
      <span className={cn("font-semibold", compact ? "text-xs" : "text-xl")}>
        {formatGrade(percentage)}
      </span>
    </span>
  );
}

export function GradeChange({
  value,
  unit = "percent",
  compact = false,
  comparison = "since the previous saved gradebook",
}: {
  value?: number;
  unit?: "percent" | "gpa";
  compact?: boolean;
  comparison?: string;
}) {
  const label = formatGradeChange(value, unit);
  if (!label || value === undefined) return null;
  const up = value > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const description =
    unit === "percent"
      ? `${label.slice(0, -1)} percentage points ${comparison}`
      : `${label} GPA points ${comparison}`;
  return (
    <span
      title={description}
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-0.5 whitespace-nowrap rounded-md px-1.5 py-0.5 font-semibold tabular-nums",
        up
          ? "bg-grade-up/12 text-grade-up"
          : "bg-grade-down/12 text-grade-down",
        compact ? "text-[0.65rem]" : "text-xs",
      )}
    >
      {!compact && <Icon className="size-3" aria-hidden="true" />}
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{description}</span>
    </span>
  );
}
