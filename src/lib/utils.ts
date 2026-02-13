import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: number): string {
  const diff = (Date.now() - date) / 1000;

  const rtf = new Intl.RelativeTimeFormat("en");

  if (diff < 60) return rtf.format(-Math.floor(diff), "second");
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), "hour");
  return rtf.format(-Math.floor(diff / 86400), "day");
}

export function roundTo(value: number, decimals: number): number {
  const p = Math.pow(10, decimals);

  // NOTE: Rounding up because thats what facts does in most situations
  // May want to address uses of this function to avoid confusion
  return Math.ceil(value * p) / p;
}
