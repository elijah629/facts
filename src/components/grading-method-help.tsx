import { Info } from "lucide-react";
import type { Class } from "@/types/report";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const METHOD_DESCRIPTIONS: Record<Class["gradingMethod"], string> = {
  points:
    "This class uses total points. Every graded assignment adds to the earned and possible point totals. Categories organize the work, but they do not have fixed weights.",
  mixed:
    "This class uses weighted categories. Inside each category, FACTS may average assignment percentages when the point values match, or use total points when they do not. The category weight decides how much that result changes the class grade.",
  percent:
    "This class uses weighted categories and averages the assignment percentages inside each one. Zero-point extra credit adds percentage points without becoming another assignment in that average. The category weight decides how much the result changes the class grade.",
};

export function GradingMethodHelp({
  method,
}: {
  method: Class["gradingMethod"];
}) {
  const label = method.toUpperCase();

  return (
    <div className="flex items-center gap-1">
      <Badge variant="outline" className="font-mono">
        {label}
      </Badge>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={`What ${label} grading means`}
          >
            <Info />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-[min(20rem,calc(100vw-2rem))]"
          side="bottom"
        >
          {METHOD_DESCRIPTIONS[method]}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
