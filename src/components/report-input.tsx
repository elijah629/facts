"use client";

import { ClipboardPaste } from "lucide-react";
import { useState } from "react";
import { serverFetch } from "@/app/actions";
import { parseReportFromHtml } from "@/lib/report/parser";
import { useReport } from "@/lib/report/store";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function ReportInput() {
  const { reportUrl, setReport, setReportUrl } = useReport();
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
      className="flex min-w-0 flex-1 gap-2"
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
        className="min-w-0"
        aria-label="FACTS report link"
        placeholder="Report URL"
        type="url"
        value={reportUrl}
        onChange={(event) => {
          setReportUrl(event.target.value);
          setButtonVariant(undefined);
          setText("Fetch");
        }}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Paste report URL"
            onClick={paste}
          >
            <ClipboardPaste />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Paste report URL</TooltipContent>
      </Tooltip>
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
