"use client";

import { GraduationCap, TrashIcon } from "lucide-react";
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

export function ReportSidebar() {
  const lastUpdated = useReport((x) => x.lastUpdated);
  const report = useReport((x) => x.report);
  const clear = useReport((x) => x.clear);

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
                  {report && <>GPA: {gpa(report.classes).toFixed(3)}</>}
                </div>
              </Link>
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
          App Version:{" "}
          {new Date(
            Number(process.env.NEXT_PUBLIC_BUILD_DATE),
          ).toLocaleDateString()}
        </span>

        {lastUpdated && (
          <span className="text-sm">Last fetched: {timeAgo(lastUpdated)}</span>
        )}
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
