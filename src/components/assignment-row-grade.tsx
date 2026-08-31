import { letterGrade } from "@/lib/grades";
import { roundTo } from "@/lib/utils";
import type { Class } from "@/types/report";

export function AssignmentRowGrade({
  points,
  maxPoints,
  gradingMethod,
}: {
  points: number;
  maxPoints: number;
  gradingMethod: Class["gradingMethod"];
}) {
  if (maxPoints === 0) {
    const unit =
      gradingMethod === "percent" ? "extra-credit percent" : "extra point";

    return (
      <>
        {points}/{maxPoints}{" "}
        <span className="text-muted-foreground">
          (+{roundTo(points, 3).toFixed(3)} {unit}
          {points === 1 ? "" : "s"})
        </span>
      </>
    );
  }

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
