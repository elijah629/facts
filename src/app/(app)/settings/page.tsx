import { ChevronRight, FileText, Plug, RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SettingsPreferences } from "@/components/settings-preferences";

export const metadata: Metadata = { title: "Settings · facts" };

const links = [
  {
    href: "/connected-apps",
    label: "Connected apps",
    detail: "Manage ChatGPT and other authorized clients.",
    icon: Plug,
  },
  {
    href: "/raw-report",
    label: "Raw FACTS report",
    detail: "Open the original report from FACTS.",
    icon: FileText,
  },
  {
    href: "/sign-in?reconnect=gmail",
    label: "Reconnect Gmail",
    detail: "Renew access to email with FACTS report links.",
    icon: RefreshCw,
  },
] as const;

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Settings
      </h1>
      <section className="rounded-xl border p-4">
        <SettingsPreferences />
      </section>
      <nav
        aria-label="Account and reports"
        className="divide-y overflow-hidden rounded-xl border"
      >
        {links.map(({ href, label, detail, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 p-4 hover:bg-muted"
          >
            <Icon className="size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="block font-medium">{label}</span>
              <span className="block text-sm text-muted-foreground">
                {detail}
              </span>
            </div>
            <ChevronRight className="size-4 shrink-0" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
