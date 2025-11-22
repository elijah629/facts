"use client";

import { SelectClass } from "@/components/select-class";
import { SelectSection } from "@/components/select-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { classGrade } from "@/lib/grades";
import { useReport } from "@/lib/report/store";
import { useState } from "react";

export default function FinalCalculator() {
  const report = useReport((x) => x.report);
  const [cls, setCls] = useState<string | undefined>(undefined);
  const [section, setSection] = useState<string | undefined>(undefined);
  const [goal, setGoal] = useState<string>("100");

  if (!report) {
    return (
      <Card className="max-w-md mx-auto mt-10">
        <CardContent className="text-center text-gray-700">
          Please load a report
        </CardContent>
      </Card>
    );
  }

  let requiredScore: number | null = null;

  if (cls && section) {
    const selectedClass = report.classes[Number(cls)];
    const selectedSection = selectedClass.sections[Number(section)];

    const grade = classGrade(selectedClass);

    if (selectedSection) {
      const finalWeight = selectedSection.weight ?? 0;

      requiredScore =
        ((Number(goal) / 100 - grade * (1 - finalWeight)) / finalWeight) * 100;
    }
  }

  return (
    <Card className="max-w-md mx-auto mt-10 space-y-4">
      <CardHeader>
        <CardTitle className="text-3xl text-center">Final Calculator</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Label>Class</Label>
          <SelectClass
            classes={report.classes.filter((x) => x.gradingMethod !== "points")}
            value={cls}
            onValueChange={setCls}
          />
        </div>

        {cls && (
          <div>
            <Label>Final Section</Label>
            <SelectSection
              cls={report.classes[Number(cls)]}
              value={section}
              onValueChange={setSection}
            />
          </div>
        )}

        <div>
          <Label>Goal (%)</Label>
          <Input
            type="number"
            min={0}
            max={150}
            step={1}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Enter your target grade"
          />
        </div>

        {requiredScore !== null && (
          <Card>
            <CardContent className="text-center text-lg font-medium">
              You need a {requiredScore.toFixed(2)}% on the final to get a{" "}
              {goal}%.
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
