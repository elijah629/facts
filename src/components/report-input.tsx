"use client";

import { useReport } from "@/lib/report/store";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { parseReportFromHtml } from "../lib/report/parser";
import { serverFetch } from "@/app/actions";

export function ReportInput() {
  const { reportUrl, setReport, setReportUrl } = useReport();

  return (
    <form
      className="flex w-full gap-2"
      onSubmit={async (e) => {
        e.preventDefault();

        const html = await serverFetch(reportUrl);
        const report = parseReportFromHtml(html);

        setReport(report);
      }}
    >
      <Input
        placeholder="Report URL"
        type="url"
        value={reportUrl}
        onChange={(event) => setReportUrl(event.target.value)}
      />
      <Button type="submit">Fetch</Button>
    </form>
  );
}
