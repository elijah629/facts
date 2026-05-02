"use server";

const MAX_REPORT_BYTES = 2_000_000;

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

function assertAllowedReportUrl(value: string): URL {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Report URL must use HTTP or HTTPS.");
  }

  if (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost") ||
    isPrivateIpv4(hostname)
  ) {
    throw new Error("Report URL host is not allowed.");
  }

  return url;
}

export async function serverFetch(url: string): Promise<string> {
  const reportUrl = assertAllowedReportUrl(url);
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

  return text;
}
