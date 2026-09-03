"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SignInButton({ oauthQuery }: { oauthQuery?: string }) {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          callbackURL: "/",
          ...(oauthQuery ? { oauth_query: oauthQuery } : {}),
        }),
      });
      const result = (await response.json()) as {
        url?: string;
        message?: string;
      };
      if (!response.ok || !result.url) {
        setError(result.message ?? "Google sign-in failed.");
        setPending(false);
        return;
      }
      window.location.assign(result.url);
    } catch {
      setError("Google sign-in failed.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button disabled={pending} onClick={signIn}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
