"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ConsentForm({ oauthQuery }: { oauthQuery: string }) {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function decide(accept: boolean) {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch("/api/auth/oauth2/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accept, oauth_query: oauthQuery }),
      });
      const result = (await response.json()) as {
        redirect_uri?: string;
        message?: string;
      };
      if (!response.ok || !result.redirect_uri) {
        setError(result.message ?? "OAuth consent failed.");
        setPending(false);
        return;
      }
      window.location.assign(result.redirect_uri);
    } catch {
      setError("OAuth consent failed.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-3">
        <Button
          disabled={pending}
          variant="outline"
          onClick={() => decide(false)}
        >
          Deny
        </Button>
        <Button disabled={pending} onClick={() => decide(true)}>
          Allow
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
