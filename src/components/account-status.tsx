"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useReport } from "@/lib/report/store";

export function AccountStatus() {
  const pathname = usePathname();
  const { authenticated, loading, stale, syncError } = useReport();
  if (pathname === "/sign-in" || pathname === "/consent") return null;
  if (loading)
    return (
      <span className="text-sm text-muted-foreground">Refreshing FACTS…</span>
    );
  if (!authenticated)
    return (
      <Button asChild>
        <Link href="/sign-in">Sign in</Link>
      </Button>
    );
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={stale ? "text-amber-500" : "text-emerald-500"}>
        {stale
          ? syncError
            ? "Couldn’t refresh gradebook"
            : "Last updated gradebook"
          : "Live FACTS refreshed"}
      </span>
      <Button
        variant="outline"
        onClick={async () => {
          await fetch("/api/auth/sign-out", { method: "POST" });
          window.location.assign("/sign-in");
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
