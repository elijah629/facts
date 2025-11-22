"use client";

import { CalendarIcon, Dot } from "lucide-react";
import { useReport } from "@/lib/report/store";
import { generateGpaChartData } from "@/lib/dated-gpa";
import { GpaChart } from "@/components/gpa-chart";

export default function Home() {
  const report = useReport((x) => x.report);
  const weighted = useReport((x) => x.weighted);

  if (!report) {
    return (
      <>
        <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
          Setup guide
        </h2>
        <p className="leading-7 not-first:mt-6">
          Visit your school email. Look for a message from "Renweb", open it.
          Inside of that email, there will be a link. Copy and paste it into the
          box above, then click "Fetch"
        </p>
      </>
    );
  }

  const chartData = generateGpaChartData(report, weighted);
  const currentGPA = chartData.at(-1)!.gpa;

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
      <p className="leading-7 not-first:mt-6"></p>
      <GpaChart chartData={chartData} />
    </>
  );
}
