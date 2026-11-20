"use client";

import { Calculator } from "lucide-react";
import dynamic from "next/dynamic";
import { type ReactNode, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Class } from "@/types/report";

const FinalCalculator = dynamic(
  () => import("./final-calculator").then((module) => module.FinalCalculator),
  { loading: () => <p>Loading calculator…</p> },
);

export function GradeCalculatorToggle({
  course,
  children,
}: {
  course?: Class;
  children?: ReactNode;
}) {
  const panelId = useId();
  const [panel, setPanel] = useState<"initial" | "open" | "closed">("initial");
  const open = panel === "open";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={course ? "outline" : "default"}
          aria-controls={panelId}
          aria-expanded={open}
          onClick={() => setPanel(open ? "closed" : "open")}
        >
          <Calculator /> Grade &amp; final calculator
        </Button>
        {children}
      </div>
      <section
        hidden={!open}
        id={panelId}
        aria-label="Grade and final calculator"
      >
        {panel !== "initial" && (
          <FinalCalculator key={course?.fullName} course={course} />
        )}
      </section>
    </div>
  );
}
