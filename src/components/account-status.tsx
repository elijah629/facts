"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { refreshGradebook } from "@/components/gradebook-loader";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { useReport } from "@/lib/report/store";

export function AccountStatus() {
  const pathname = usePathname();
  const authenticated = useReport((state) => state.authenticated);
  const loading = useReport((state) => state.loading);
  const stale = useReport((state) => state.stale);
  const syncError = useReport((state) => state.syncError);
  const lastUpdated = useReport((state) => state.lastUpdated);
  const [signOutError, setSignOutError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (pathname === "/sign-in" || pathname === "/consent") return null;
  if (!authenticated && loading && !lastUpdated) {
    return pathname !== "/" &&
      !pathname.startsWith("/class/") &&
      pathname !== "/final-calculator" &&
      pathname !== "/college" ? (
      <Button asChild size="sm" variant="ghost">
        <Link href="/">Gradebook</Link>
      </Button>
    ) : null;
  }
  if (!authenticated) {
    return (
      <Button asChild>
        <Link href="/sign-in">Sign in</Link>
      </Button>
    );
  }

  const needsGmail =
    syncError === "GMAIL_SCOPE_MISSING" ||
    syncError === "GOOGLE_AUTHORIZATION_UNAVAILABLE" ||
    syncError === "GOOGLE_ACCOUNT_NOT_CONNECTED";

  async function signOut() {
    setSigningOut(true);
    setSignOutError(false);
    try {
      const { error } = await authClient.signOut();
      if (error) throw new Error("SIGN_OUT_FAILED");
      window.location.assign("/sign-in");
    } catch {
      setSignOutError(true);
      setSigningOut(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span
        aria-live="polite"
        className={stale ? "text-amber-500" : "text-muted-foreground"}
      >
        {loading
          ? "Refreshing…"
          : stale
            ? "Refresh failed"
            : lastUpdated
              ? `Synced ${new Date(lastUpdated).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
              : "Waiting for first sync"}
      </span>
      {needsGmail && (
        <Button asChild size="sm" variant="outline">
          <Link href="/sign-in?reconnect=gmail">Reconnect Gmail</Link>
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => void refreshGradebook()}
      >
        <RefreshCw /> Refresh
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={signingOut}
        onClick={() => void signOut()}
      >
        Sign out
      </Button>
      {signOutError && <span role="alert">Couldn’t sign out. Try again.</span>}
    </div>
  );
}
