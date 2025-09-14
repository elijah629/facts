"use client";

import { useState } from "react";
import { serverFetch } from "@/app/actions";
import { useReport } from "@/lib/report/store";
import { parseReportFromHtml } from "../lib/report/parser";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function ReportInput() {
  const { reportUrl, setReport, setReportUrl } = useReport();
  const [fetching, setFetching] = useState(false);

  return (
    <form
      className="flex w-full gap-2"
      onSubmit={async (e) => {
        e.preventDefault();

        setFetching(true);
        const html = await serverFetch(reportUrl);
        const report = parseReportFromHtml(html);
        setFetching(false);

        setReport(report);
      }}
    >
      <Input
        placeholder="Report URL"
        type="url"
        value={reportUrl}
        onChange={(event) => setReportUrl(event.target.value)}
      />
      <Button type="submit" disabled={fetching}>
        {fetching ? "Fetching" : "Fetch"}
      </Button>
    </form>
  );
}
