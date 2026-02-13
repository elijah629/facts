import { letterGrade } from "@/lib/grades";
import { roundTo } from "@/lib/utils";

export function AssignmentRowGrade({
  points,
  maxPoints,
}: {
  points: number;
  maxPoints: number;
}) {
  const grade = (points * 100) / Math.max(1, maxPoints);

  return (
    <>
      {points}/{maxPoints}{" "}
      <span className={grade >= 100 ? "glow" : "text-muted-foreground"}>
        ({letterGrade(grade / 100)} {roundTo(grade, 3).toFixed(3)}
        %)
      </span>
    </>
  );
}
