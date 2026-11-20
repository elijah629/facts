"use client";

import {
  Calculator,
  ChartNoAxesColumnIncreasing,
  GraduationCap,
  History,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GradeChange, GradeMark } from "@/components/grade-mark";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { classGrade } from "@/lib/grades";
import { sidebarClassName } from "@/lib/report/sidebar-class-name";
import { useReport } from "@/lib/report/store";

const pages = [
  { href: "/", label: "Gradebook", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: History },
  { href: "/gpa", label: "GPA & A–G", icon: ChartNoAxesColumnIncreasing },
  { href: "/final-calculator", label: "Final calculator", icon: Calculator },
] as const;

export function ReportSidebar() {
  const pathname = usePathname();
  const report = useReport((state) => state.report);
  const changes = useReport((state) => state.classChanges);
  const { isMobile, setOpenMobile } = useSidebar();
  function closeMobile() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="font-semibold">
              <Link href="/" onClick={closeMobile}>
                <GraduationCap />
                <span>facts</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="pt-0">
          <SidebarMenu>
            {pages.map(({ href, label, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton asChild isActive={pathname === href}>
                  <Link href={href} prefetch={false} onClick={closeMobile}>
                    <Icon />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        {!!report?.classes.length && (
          <SidebarGroup>
            <SidebarGroupLabel>Courses</SidebarGroupLabel>
            <SidebarMenu>
              {report.classes.map((cls, index) => {
                const href = `/class/${index}` as const;
                return (
                  <SidebarMenuItem key={cls.fullName}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === href}
                      className="h-auto min-h-11 py-1.5"
                    >
                      <Link href={href} onClick={closeMobile}>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div
                            className="truncate font-medium"
                            title={cls.displayName}
                          >
                            {sidebarClassName(cls.displayName)}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <GradeMark percentage={classGrade(cls)} compact />
                            <GradeChange
                              value={changes[cls.fullName]}
                              compact
                            />
                          </div>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/settings"}>
              <Link href="/settings" onClick={closeMobile}>
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
