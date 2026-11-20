"use client";

import { CalendarIcon, ChevronRight, Dot } from "lucide-react";
import Link from "next/link";
import { GradeCalculatorToggle } from "@/components/grade-calculator-toggle";
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
import { gpa } from "@/lib/grades";
import { useReport } from "@/lib/report/store";

export default function Home() {
  const report = useReport((x) => x.report);
  const weighted = useReport((x) => x.weighted);
  const loading = useReport((x) => x.loading);
  const authenticated = useReport((x) => x.authenticated);
  const syncError = useReport((x) => x.syncError);
  const changes = useReport((x) => x.changes);
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

  const currentGPA = gpa(report.classes, weighted);

  return (
    <>
      <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        {report.for}’s gradebook
      </h2>
      <p className="leading-7 flex text-lg items-center not-first:mt-6">
        <CalendarIcon size={16} className="mr-1" />
        {report.term}
        <Dot size={16} /> {report.yearRange.min}-{report.yearRange.max}
        <Dot size={16} />
        <span>
          GPA:{" "}
          <span className="font-mono font-semibold">
            {currentGPA.toFixed(3)}
          </span>
        </span>
      </p>
      <div className="mt-6 space-y-6">
        <GradeCalculatorToggle>
          <Button asChild variant="outline">
            <Link href="/gpa-guide">GPA guide</Link>
          </Button>
        </GradeCalculatorToggle>
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
                        {title} <ChevronRight className="size-4 shrink-0" />
                      </Link>
                    )}
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                      {entries.slice(0, 4).map((entry) => (
                        <li key={entry.id}>{entry.text}</li>
                      ))}
                    </ul>
                    {entries.length > 4 && (
                      <details className="mt-2 text-sm text-muted-foreground">
                        <summary className="cursor-pointer">
                          Show {entries.length - 4} more
                        </summary>
                        <ul className="mt-2 list-disc space-y-1 pl-4">
                          {entries.slice(4).map((entry) => (
                            <li key={entry.id}>{entry.text}</li>
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
    </>
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
