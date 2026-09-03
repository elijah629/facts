"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function SignInButton() {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    setError(undefined);
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
      if (error) setError(error.message || "Google sign-in failed.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Google sign-in failed.",
      );
    }
    setPending(false);
  }

  return (
    <div className="w-full space-y-3">
      <Button className="w-full" disabled={pending} size="lg" onClick={signIn}>
        {pending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <ArrowRight aria-hidden="true" />
        )}
        {pending ? "Opening Google…" : "Continue with Google"}
      </Button>
      {error ? (
        <p
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
