"use client";

import {
  Calculator,
  ChartAreaIcon,
  GraduationCap,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { classGrade, gpa, letterGrade } from "@/lib/grades";
import { useReport } from "@/lib/report/store";
import { timeAgo } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "./ui/label";

export function ReportSidebar() {
  const { lastUpdated, report, clear, weighted, setWeighted } = useReport();

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GraduationCap size={24} />
                </div>
                <div className="flex flex-col gap-2 leading-none">
                  <span className="font-semibold">🔥 facts 🔥</span>
                  {report && (
                    <span>
                      GPA:{" "}
                      <span className="font-mono font-semibold">
                        {gpa(report.classes, weighted).toFixed(3)}
                      </span>
                    </span>
                  )}
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/gpa-guide">
                <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <ChartAreaIcon size={24} />
                </div>
                <div className="flex flex-col gap-2 leading-none">
                  GPA Guide
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/final-calculator">
                <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Calculator size={24} />
                </div>
                <div className="flex flex-col gap-2 leading-none">
                  Final Calculator
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={weighted}
                  onCheckedChange={setWeighted}
                  id="weighted-gpa"
                />
                <Label htmlFor="weighted-gpa">AP/Honors Boost</Label>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {report && (
          <SidebarGroup>
            <SidebarMenu>
              {report.classes.map((cls, i) => {
                const percentage = classGrade(cls);
                const letter = letterGrade(percentage);

                return (
                  <SidebarMenuItem key={cls.fullName}>
                    <SidebarMenuButton asChild>
                      <Link href={`/class/${i}`}>
                        <div className="flex items-center gap-2">
                          <GraduationCap size={16} />
                          <span>{cls.displayName}</span>
                        </div>
                        <Badge variant="default" className="ml-auto">
                          {letter}
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <span className="text-sm">
          <strong>App Version</strong>: {process.env.NEXT_PUBLIC_BUILD_DATE}
          {lastUpdated && (
            <>
              <br />
              <strong>Last fetched</strong>: {timeAgo(lastUpdated)}
            </>
          )}
        </span>

        <span>
          made with ❤ by{" "}
          <Link href="https://eli.best" className="underline">
            eli
          </Link>
        </span>

        <span>
          <Link href="https://github.com/elijah629/facts" className="underline">
            source code
          </Link>
        </span>

        {report && (
          <Button
            variant="destructive"
            onClick={() => {
              clear();
            }}
          >
            <TrashIcon /> Clear report
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
