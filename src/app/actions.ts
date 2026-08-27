"use server";

import { assertFactsProgressReportUrl } from "@/lib/report/urls";

const MAX_REPORT_BYTES = 2_000_000;

export async function serverFetch(url: string): Promise<string> {
  const reportUrl = assertFactsProgressReportUrl(url);
  const response = await fetch(reportUrl, {
    cache: "no-store",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Report fetch failed with status ${response.status}.`);
  }

  const contentLength = response.headers.get("content-length");

  if (contentLength && Number(contentLength) > MAX_REPORT_BYTES) {
    throw new Error("Report response is too large.");
  }

  const text = await response.text();

  if (text.length > MAX_REPORT_BYTES) {
    throw new Error("Report response is too large.");
  }

  if (/back-to-login-link|name=["']password["']/i.test(text)) {
    throw new Error("This FACTS session has expired. Export a new class link.");
  }

  return text;
}

export async function serverFetchAll(urls: string[]): Promise<string[]> {
  if (urls.length === 0 || urls.length > 20) {
    throw new Error("Provide between 1 and 20 class report links.");
  }

  return Promise.all(urls.map(serverFetch));
}
