"use client";

import { CalendarIcon, Dot } from "lucide-react";
import Link from "next/link";
import { StudentOverview } from "@/components/student-overview";
import { gpa } from "@/lib/grades";
import { useReport } from "@/lib/report/store";

export default function Home() {
  const report = useReport((x) => x.report);
  const weighted = useReport((x) => x.weighted);
  const loading = useReport((x) => x.loading);
  const authenticated = useReport((x) => x.authenticated);
  const syncError = useReport((x) => x.syncError);

  if (!report) {
    return (
      <>
        <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
          {loading ? "Refreshing FACTS…" : "Sign in to view grades"}
        </h2>
        {!loading && !authenticated && (
          <p className="leading-7 not-first:mt-6">
            <Link className="underline" href="/sign-in">
              Sign in
            </Link>{" "}
            with the account that receives your FACTS report links.
          </p>
        )}
        {!loading && authenticated && (
          <p className="leading-7 not-first:mt-6">
            {gmailErrorMessage(syncError)}
          </p>
        )}
      </>
    );
  }

  const currentGPA = gpa(report.classes, weighted);

  return (
    <>
      <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        Hello {report.for}! 👋
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
      <div className="mt-6">
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
      return "Gmail access is missing. Sign out, then sign in again.";
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
