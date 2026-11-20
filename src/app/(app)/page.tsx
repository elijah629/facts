"use client";

import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import Link from "next/link";

import { GradeChange, GradeMark } from "@/components/grade-mark";
import { refreshGradebook } from "@/components/gradebook-loader";
import { StudentOverview } from "@/components/student-overview";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { classGrade, schoolGpas } from "@/lib/grades";
import { formatGradeChange } from "@/lib/grades/display";
import { useReport } from "@/lib/report/store";

export default function Home() {
  const report = useReport((x) => x.report);
  const weighted = useReport((x) => x.weighted);
  const loading = useReport((x) => x.loading);
  const authenticated = useReport((x) => x.authenticated);
  const syncError = useReport((x) => x.syncError);
  const changes = useReport((x) => x.changes);
  const classChanges = useReport((x) => x.classChanges);
  const gpaChanges = useReport((x) => x.gpaChanges);
  const changesObservedAt = useReport((x) => x.changesObservedAt);

  if (!report) {
    return (
      <>
        <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
          {loading
            ? "Loading your gradebook…"
            : authenticated
              ? "Gradebook unavailable"
              : "Sign in to view grades"}
        </h2>
        {!loading && !authenticated && !syncError && (
          <p className="leading-7 not-first:mt-6">
            <Link className="underline" href="/sign-in">
              Sign in
            </Link>{" "}
            with the account that receives your FACTS report links.
          </p>
        )}
        {!loading && (authenticated || syncError) && (
          <div className="mt-4 space-y-3">
            <p>{gmailErrorMessage(syncError)}</p>
            <Button variant="outline" onClick={() => void refreshGradebook()}>
              Try again
            </Button>
          </div>
        )}
      </>
    );
  }

  const school = schoolGpas(report.classes);
  const currentGPA = weighted ? school.weighted : school.unweighted;

  const movement = Object.values(classChanges).filter((change) =>
    formatGradeChange(change),
  );
  const up = movement.filter((change) => change > 0).length;
  const down = movement.length - up;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">
            {report.for}’s gradebook
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.term} · {report.yearRange.min}–{report.yearRange.max}
          </p>
        </div>
        <Link
          href="/gpa"
          className="flex items-center gap-2 rounded-lg border bg-muted/35 px-3 py-2 hover:bg-muted"
        >
          <div>
            <p className="text-xs text-muted-foreground">
              {weighted ? "Weighted GPA" : "Unweighted GPA"}
            </p>
            <p className="text-2xl font-semibold leading-tight tabular-nums">
              {currentGPA?.toFixed(3) ?? "—"}
            </p>
          </div>
          <GradeChange
            value={weighted ? gpaChanges?.weighted : gpaChanges?.unweighted}
            unit="gpa"
          />
        </Link>
      </header>

      <section aria-labelledby="class-grades" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="class-grades" className="text-lg font-semibold">
            Class grades
          </h2>
          {movement.length > 0 && (
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="inline-flex items-center gap-1 text-grade-up">
                <ArrowUpRight className="size-3" aria-hidden="true" /> {up} up
              </span>
              <span className="inline-flex items-center gap-1 text-grade-down">
                <ArrowDownRight className="size-3" aria-hidden="true" /> {down}{" "}
                down
              </span>
            </div>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {report.classes.map((course, index) => (
            <Link
              key={course.fullName}
              href={`/class/${index}`}
              className="group flex min-h-17 items-center gap-3 rounded-xl border bg-card px-3 py-2 transition-colors hover:bg-muted/60"
            >
              <p className="min-w-0 flex-1 text-sm font-medium group-hover:text-foreground">
                {course.displayName}
              </p>
              <div className="flex min-w-17 flex-col items-end gap-0.5">
                <GradeMark percentage={classGrade(course)} />
                <GradeChange value={classChanges[course.fullName]} compact />
              </div>
              <ChevronRight
                className="size-3 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
        {movement.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Changes since the previous saved gradebook, in percentage points.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/history">Grade history</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/final-calculator">Grade &amp; final calculator</Link>
          </Button>
        </div>
      </section>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Latest changes</CardTitle>
            {changes.length > 0 && changesObservedAt && (
              <CardDescription>
                Observed{" "}
                {new Date(changesObservedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {changes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No changes in the latest saved comparison.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {changes.map(({ id, classIndex, title, entries }) => (
                  <div key={id} className="rounded-lg border p-3">
                    {classIndex === null ? (
                      <h3 className="font-medium">{title}</h3>
                    ) : (
                      <Link
                        href={`/class/${classIndex}`}
                        className="flex items-center justify-between gap-2 font-medium hover:underline"
                      >
                        <span className="min-w-0">{title}</span>
                        <GradeChange
                          compact
                          value={
                            classChanges[report.classes[classIndex]?.fullName]
                          }
                        />
                        <ChevronRight
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                      </Link>
                    )}
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                      {entries.slice(0, 4).map((entry) => (
                        <li key={entry.id}>
                          {entry.text}{" "}
                          <GradeChange value={entry.change} compact />
                        </li>
                      ))}
                    </ul>
                    {entries.length > 4 && (
                      <details className="mt-2 text-sm text-muted-foreground">
                        <summary className="cursor-pointer">
                          Show {entries.length - 4} more
                        </summary>
                        <ul className="mt-2 list-disc space-y-1 pl-4">
                          {entries.slice(4).map((entry) => (
                            <li key={entry.id}>
                              {entry.text}{" "}
                              <GradeChange value={entry.change} compact />
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <StudentOverview report={report} />
      </div>
    </div>
  );
}

function gmailErrorMessage(error: string | undefined): string {
  switch (error) {
    case "GMAIL_API_DISABLED":
      return "Gmail API is not enabled for this app.";
    case "GMAIL_SCOPE_MISSING":
      return "Gmail access is missing. Use Reconnect Gmail to grant access.";
    case "GOOGLE_AUTHORIZATION_UNAVAILABLE":
    case "GOOGLE_ACCOUNT_NOT_CONNECTED":
      return "Reconnect Gmail to find your FACTS report.";
    case "SYNC_REQUEST_FAILED":
      return "The gradebook could not be reached.";
    case "GMAIL_DOMAIN_BLOCKED":
      return "Your Google Workspace administrator blocked Gmail access.";
    case "GMAIL_RATE_LIMITED":
      return "Gmail is temporarily rate limited. Try again later.";
    case "GMAIL_API_FORBIDDEN":
      return "Google denied Gmail access for this app.";
    default:
      return "No usable FACTS Gradebook Progress Report found in Gmail.";
  }
}
