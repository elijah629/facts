"use client";

import {
  AlertTriangle,
  CalendarClock,
  CircleGauge,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getStudentInsights } from "@/lib/student-insights";
import type { Report } from "@/types/report";
import { Badge } from "./ui/badge";

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function StudentOverview({ report }: { report: Report }) {
  const {
    lowestClasses,
    upcomingAssignments,
    missingAssignments,
    weakAssignments,
  } = getStudentInsights(report);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleGauge className="size-4" />
            Classes to Watch
          </CardTitle>
          <CardDescription>Lowest current percentages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {lowestClasses.length === 0 ? (
            <EmptyState>No graded classes yet.</EmptyState>
          ) : (
            lowestClasses.map(({ cls, classIndex, percentage, letter }) => (
              <Link
                className="flex items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
                href={`/class/${classIndex}`}
                key={cls.fullName}
              >
                <span className="min-w-0 truncate text-sm font-medium">
                  {cls.displayName}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-sm">
                    {(percentage * 100).toFixed(cls.roundingPrecision)}%
                  </span>
                  <Badge variant="outline">{letter}</Badge>
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4" />
            Upcoming
          </CardTitle>
          <CardDescription>Next due dates in your report</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingAssignments.length === 0 ? (
            <EmptyState>No upcoming assignments found.</EmptyState>
          ) : (
            upcomingAssignments.map(({ assignment, cls, classIndex }) => (
              <Link
                className="block rounded-md border p-3 transition-colors hover:bg-muted/50"
                href={`/class/${classIndex}`}
                key={`${cls.fullName}-${assignment.name}-${new Date(
                  assignment.due,
                ).getTime()}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {assignment.name}
                  </span>
                  <Badge variant="secondary">
                    {formatDate(assignment.due)}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {cls.displayName}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4" />
            Missing
          </CardTitle>
          <CardDescription>Recent missing work</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {missingAssignments.length === 0 ? (
            <EmptyState>No missing assignments.</EmptyState>
          ) : (
            missingAssignments.map(({ assignment, cls, classIndex }) => (
              <Link
                className="block rounded-md border p-3 transition-colors hover:bg-muted/50"
                href={`/class/${classIndex}`}
                key={`${cls.fullName}-${assignment.name}-${new Date(
                  assignment.due,
                ).getTime()}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {assignment.name}
                  </span>
                  <Badge variant="destructive">
                    {formatDate(assignment.due)}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {cls.displayName}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="size-4" />
            Biggest Drags
          </CardTitle>
          <CardDescription>Scores furthest below class average</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {weakAssignments.length === 0 ? (
            <EmptyState>No below-average assignments found.</EmptyState>
          ) : (
            weakAssignments.map(({ assignment, cls, classIndex, grade }) => (
              <Link
                className="block rounded-md border p-3 transition-colors hover:bg-muted/50"
                href={`/class/${classIndex}`}
                key={`${cls.fullName}-${assignment.name}-${new Date(
                  assignment.due,
                ).getTime()}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {assignment.name}
                  </span>
                  <Badge variant="outline">{(grade * 100).toFixed(1)}%</Badge>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {cls.displayName}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
