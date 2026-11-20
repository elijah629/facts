"use client";

import {
  ChartNoAxesColumnIncreasing,
  History,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Grades", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: History },
  { href: "/gpa", label: "GPA", icon: ChartNoAxesColumnIncreasing },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function MobileNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main navigation"
      className="grid grid-cols-4 border-b px-2 py-1 md:hidden"
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-1 rounded-md px-1 text-xs text-muted-foreground",
              active && "bg-muted font-medium text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
