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
  const [text, setText] = useState("Fetch");
  const [buttonVariant, setButtonVariant] = useState<
    "destructive" | "default" | undefined
  >(undefined);

  return (
    <form
      className="flex w-full gap-2"
      onSubmit={async (e) => {
        e.preventDefault();

        setFetching(true);
        setText("Fetching...");
        setButtonVariant(undefined);

        try {
          const html = await serverFetch(reportUrl);
          const report = parseReportFromHtml(html);

          setReport(report);

          setText("Fetched");
          setButtonVariant(undefined);
        } catch {
          setText("Invalid");
          setButtonVariant("destructive");
        } finally {
          setFetching(false);
        }
      }}
    >
      <Input
        placeholder="Report URL"
        type="url"
        value={reportUrl}
        onChange={(event) => {
          setReportUrl(event.target.value);
          setButtonVariant(undefined);
          setText("Fetch");
        }}
      />
      <Button
        type="submit"
        disabled={fetching}
        {...(buttonVariant ? { variant: buttonVariant } : {})}
      >
        {text}
      </Button>
    </form>
  );
}
