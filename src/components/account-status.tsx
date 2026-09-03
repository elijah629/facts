"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { useReport } from "@/lib/report/store";

export function AccountStatus() {
  const router = useRouter();
  const { authenticated, loading, stale, syncError } = useReport();
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
          const { error } = await authClient.signOut();
          if (!error) {
            router.replace("/sign-in");
            router.refresh();
          }
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
