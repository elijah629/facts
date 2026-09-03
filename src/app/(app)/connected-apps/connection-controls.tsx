"use client";

import { Copy, LoaderCircle, Unplug } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { revokeConnectedApp } from "./actions";

export function EndpointCopy({ url }: { url: string }) {
  const [status, setStatus] = useState("");
  return (
    <div className="space-y-2">
      <Label htmlFor="mcp-url">MCP server URL</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="mcp-url"
          readOnly
          value={url}
          className="font-mono"
          onFocus={(event) => event.target.select()}
        />
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setStatus("MCP URL copied.");
            } catch {
              setStatus(
                "Copy unavailable. Select the URL and copy it manually.",
              );
            }
          }}
        >
          <Copy aria-hidden="true" />
          Copy URL
        </Button>
      </div>
      <p role="status" className="min-h-5 text-sm text-muted-foreground">
        {status}
      </p>
    </div>
  );
}

export function RefreshApps() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Refreshing…" : "Refresh apps"}
    </Button>
  );
}

export function RevokeApp({
  clientId,
  name,
}: {
  clientId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value);
          setError("");
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Unplug aria-hidden="true" />
          Revoke access<span className="sr-only"> for {name}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-all">
            Revoke access for {name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Saved permission and renewable access will be removed from your
            account. Already-issued access tokens may work until they expire.
            This does not delete data already shared with the app. You can
            reconnect by authorizing it again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep access</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError("");
                try {
                  const result = await revokeConnectedApp(clientId);
                  if (result.error) setError(result.error);
                  else setOpen(false);
                } catch {
                  setError(
                    "Access could not be revoked. Check your connection and try again.",
                  );
                }
              })
            }
          >
            {pending ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : null}
            {pending ? "Revoking…" : "Revoke access"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
