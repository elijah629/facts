import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Class } from "@/types/report";
import { ArrowRight } from "lucide-react";

export function SelectSection({
  cls,
  value,
  onValueChange,
}: {
  cls: Class;
  value: string | undefined;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a section" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Sections</SelectLabel>
          {cls.sections.map((section, i) => (
            <SelectItem key={section.name} value={i.toString()}>
              <span className="flex items-center gap-2">
                {section.name}
                <ArrowRight size={16} />
                {section.weight && (
                  <span className="font-mono"> {section.weight * 100}%</span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
