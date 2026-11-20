"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useReport } from "@/lib/report/store";

export function SettingsPreferences() {
  const weighted = useReport((state) => state.weighted);
  const setWeighted = useReport((state) => state.setWeighted);
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-1">
        <Label htmlFor="weighted-gpa">Weighted school GPA</Label>
        <p className="text-sm text-muted-foreground">
          Show AP and Honors weighting on the gradebook and history.
        </p>
      </div>
      <Switch
        id="weighted-gpa"
        checked={weighted}
        onCheckedChange={setWeighted}
      />
    </div>
  );
}
