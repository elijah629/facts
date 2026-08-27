"use client";

import { useState } from "react";
import { serverFetchAll } from "@/app/actions";
import { parseReportsFromHtml } from "@/lib/report/parser";
import { useReport } from "@/lib/report/store";
import { parseReportUrls, refreshReportUrls } from "@/lib/report/urls";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function ReportInput() {
  const {
    report,
    reportUrl,
    reportUrls,
    setReport,
    setReportUrl,
    setReportUrls,
  } = useReport();
  const [fetching, setFetching] = useState(false);
  const [text, setText] = useState("Fetch");
  const [buttonVariant, setButtonVariant] = useState<
    "destructive" | "default" | undefined
  >(undefined);

  async function paste() {
    const content = await navigator.clipboard.readText();

    setReportUrl(content);
    setButtonVariant(undefined);
    setText("Fetch");
  }

  return (
    <form
      className="flex w-full gap-2"
      onSubmit={async (e) => {
        e.preventDefault();

        setFetching(true);
        setText("Fetching...");
        setButtonVariant(undefined);

        try {
          const pastedUrls = parseReportUrls(reportUrl);
          if (pastedUrls.length === 0) throw new Error("Paste a report link.");

          const urls =
            reportUrls.length > 0 && pastedUrls.length === 1
              ? refreshReportUrls(reportUrls, pastedUrls[0])
              : pastedUrls;
          const html = await serverFetchAll(urls);
          const nextReport = parseReportsFromHtml(html);

          setReport(nextReport);
          setReportUrls(urls);
          setReportUrl("");

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
        aria-label="FACTS class report links"
        placeholder={
          report
            ? "Paste one fresh class link to refresh every class"
            : "Paste all FACTS class report links, separated by spaces"
        }
        type="text"
        value={reportUrl}
        onChange={(event) => {
          setReportUrl(event.target.value);
          setButtonVariant(undefined);
          setText("Fetch");
        }}
      />
      <Button
        onClick={(e) => {
          e.preventDefault();
          paste();
        }}
      >
        Paste
      </Button>
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
