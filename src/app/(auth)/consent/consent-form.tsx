"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function ConsentForm() {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string>();

  async function decide(accept: boolean) {
    setPending(true);
    setError(undefined);
    setRedirectUrl(undefined);
    try {
      const { data, error: authError } = await authClient.oauth2.consent({
        accept,
      });
      if (authError) {
        setError(authError.message || "Could not finish authorization.");
      } else if (data?.url) {
        // Better Auth redirects automatically. Keep the URL visible only if a
        // WebView blocks that navigation.
        setRedirectUrl(data.url);
      } else {
        setError("Could not finish authorization.");
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not finish authorization.",
      );
    }
    setPending(false);
  }

  return (
    <div className="w-full space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Button
          className="w-full"
          disabled={pending}
          size="lg"
          variant="outline"
          onClick={() => decide(false)}
        >
          Don’t allow
        </Button>
        <Button
          className="w-full"
          disabled={pending}
          size="lg"
          onClick={() => decide(true)}
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : (
            <ArrowRight aria-hidden="true" />
          )}
          {pending ? "Connecting…" : "Allow access"}
        </Button>
      </div>
      {error ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <p>{error}</p>
          {redirectUrl ? (
            <a
              className="mt-2 inline-flex items-center gap-1 font-medium underline underline-offset-4"
              href={redirectUrl}
              rel="noreferrer"
              target="_blank"
            >
              Continue to ChatGPT
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </a>
          ) : null}
        </div>
      ) : redirectUrl ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          <p>ChatGPT didn’t open automatically.</p>
          <a
            className="mt-2 inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4"
            href={redirectUrl}
            rel="noreferrer"
            target="_blank"
          >
            Continue to ChatGPT
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      ) : null}
    </div>
  );
}
