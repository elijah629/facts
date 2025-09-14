"use client";

import { CalendarIcon, Dot } from "lucide-react";
import { gpa } from "@/lib/grades";
import { useReport } from "@/lib/report/store";

export default function Home() {
  const report = useReport((x) => x.report);

  if (!report) {
    return (
      <>
        <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
          Setup guide
        </h2>
        <p className="leading-7 [&:not(:first-child)]:mt-6">
          Visit your school email. Look for a message from "Renweb", open it.
          Inside of that email, there will be a link. Copy and paste it into the
          box above, then click "Fetch"
        </p>
      </>
    );
  }

  const currentGPA = gpa(report.classes);

  return (
    <>
      <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        Hello {report.for}! 👋
      </h2>
      <p className="leading-7 flex items-center [&:not(:first-child)]:mt-6">
        <CalendarIcon size={16} className="mr-1" />
        {report.term}
        <Dot size={16} /> {report.yearRange.min}-{report.yearRange.max}
      </p>
      <p className="leading-7 [&:not(:first-child)]:mt-6">
        GPA: {currentGPA.toFixed(3)}
      </p>
    </>
  );
}
