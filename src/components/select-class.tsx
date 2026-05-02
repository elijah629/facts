import { GraduationCap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Class } from "@/types/report";

export function SelectClass({
  classes,
  value,
  onValueChange,
}: {
  classes: Class[];
  value: string | undefined;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a class" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Classes</SelectLabel>
          {classes.map((cls, period) => (
            <SelectItem key={cls.fullName} value={period.toString()}>
              <div className="flex items-center gap-2">
                <GraduationCap size={16} />
                <span>{cls.displayName}</span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
