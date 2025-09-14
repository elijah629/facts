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

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function formatDate(date: string): string {
  const [month, day] = date.split("/");
  const suffix =
    day.endsWith("1") && day !== "11"
      ? "st"
      : day.endsWith("2") && day !== "12"
        ? "nd"
        : day.endsWith("3") && day !== "13"
          ? "rd"
          : "th";

  return `${monthNames[Number(month) - 1]} ${day[0] === "0" ? day[1] : day}${suffix}`;
}
