import { desc, eq } from "drizzle-orm";
import { ExternalLink, Plug, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { mcpResource } from "@/lib/auth";
import { currentSession } from "@/lib/auth/session";
import { oauthClient, oauthConsent } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { EndpointCopy, RefreshApps, RevokeApp } from "./connection-controls";

export const metadata: Metadata = { title: "Connected apps · facts" };

const scopeLabels: Record<string, string> = {
  "grades:read": "Read grades and assignments",
  "grades:history": "Read grade history",
  openid: "Identify your account",
  email: "Read your email address",
  profile: "Read your profile",
  offline_access: "Stay connected between visits",
};

async function AuthorizedApps() {
  let session: Awaited<ReturnType<typeof currentSession>>;
  try {
    session = await currentSession();
  } catch (error) {
    unstable_rethrow(error);
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm text-destructive">
          Your account could not be loaded. Refresh to try again.
        </p>
        <RefreshApps />
      </div>
    );
  }
  if (!session)
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Sign in to see which apps you have authorized and manage their access.
        </p>
        <Button asChild>
          <Link href="/sign-in">Sign in to facts</Link>
        </Button>
      </div>
    );

  let grants: {
    clientId: string;
    name: string | null;
    scopes: string[];
    updatedAt: Date;
  }[];
  try {
    // Explicit projection: never send client secrets, tokens, or other users' grants.
    grants = await db
      .select({
        clientId: oauthConsent.clientId,
        name: oauthClient.name,
        scopes: oauthConsent.scopes,
        updatedAt: oauthConsent.updatedAt,
      })
      .from(oauthConsent)
      .leftJoin(oauthClient, eq(oauthConsent.clientId, oauthClient.clientId))
      .where(eq(oauthConsent.userId, session.user.id))
      .orderBy(desc(oauthConsent.updatedAt));
  } catch {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm text-destructive">
          Your authorized apps could not be loaded. Refresh to try again.
        </p>
        <RefreshApps />
      </div>
    );
  }
  // A client may have several resource-specific grants. Revocation covers all
  // of this user's grants for that client, so show one row per app.
  const apps = new Map<
    string,
    { name: string; scopes: Set<string>; updatedAt: Date }
  >();
  for (const grant of grants) {
    const existing = apps.get(grant.clientId);
    if (existing) for (const scope of grant.scopes) existing.scopes.add(scope);
    else
      apps.set(grant.clientId, {
        name: grant.name || "OAuth app",
        scopes: new Set(grant.scopes),
        updatedAt: grant.updatedAt,
      });
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {apps.size} authorized {apps.size === 1 ? "app" : "apps"} · Your
          account only
        </p>
        <RefreshApps />
      </div>
      {apps.size === 0 ? (
        <div className="space-y-2 py-4 text-center">
          <Plug
            className="mx-auto size-6 text-muted-foreground"
            aria-hidden="true"
          />
          <h3 className="font-medium">No authorized apps</h3>
          <p className="text-sm text-muted-foreground">
            Connect ChatGPT or another MCP client using the steps above. Apps
            appear here after you approve access.
          </p>
        </div>
      ) : (
        <ul className="divide-y">
          {Array.from(apps, ([clientId, app]) => (
            <li
              key={clientId}
              className="flex flex-col gap-4 py-6 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 space-y-3">
                <h3 className="break-words font-medium">{app.name}</h3>
                <p className="break-all font-mono text-xs text-muted-foreground">
                  Client ID: {clientId}
                </p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(app.scopes, (scope) => (
                    <Badge
                      key={scope}
                      variant="secondary"
                      className="max-w-full whitespace-normal break-all"
                    >
                      {scopeLabels[scope] ?? scope}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last authorized{" "}
                  <time dateTime={app.updatedAt.toISOString()}>
                    {app.updatedAt.toISOString().slice(0, 10)} (UTC)
                  </time>
                </p>
              </div>
              <RevokeApp clientId={clientId} name={app.name} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Revoking access removes saved permission and renewable access for this
        app across your devices. Already-issued access tokens may remain valid
        until expiry. Previously shared data stays with the app; remove the
        connection in ChatGPT too if you no longer want to use it.
      </p>
    </div>
  );
}

export default function ConnectedAppsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Connected apps
        </h1>
        <p className="text-muted-foreground">
          Bring your grades into ChatGPT. Choose what can access your facts
          account.
        </p>
      </header>
      <Card>
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <Plug className="size-5 text-primary" aria-hidden="true" />
            <Badge variant="secondary">MCP · OAuth</Badge>
          </div>
          <CardTitle>
            <h2>Connect ChatGPT</h2>
          </CardTitle>
          <CardDescription>
            Ask about assignments, class grades, and changes over time using
            your own gradebook.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <EndpointCopy url={mcpResource} />
          <ol className="list-decimal space-y-4 pl-5 text-sm leading-relaxed marker:font-semibold marker:text-primary">
            <li>
              <strong>Enable developer mode in ChatGPT.</strong> On the web,
              open Settings → Security and login → Developer mode. Availability
              depends on your account and workspace permissions.
            </li>
            <li>
              <strong>Add facts.</strong> Open ChatGPT Plugins, choose the plus
              button, and create a developer-mode app. Name it facts, paste the
              MCP URL above, choose OAuth, and select CIMD if asked how to
              register the client.
            </li>
            <li>
              <strong>Approve your connection.</strong> Sign in to facts with
              the Google account that receives your FACTS report links. Review
              the permissions, then choose Allow access.
            </li>
            <li>
              <strong>Use facts in a conversation.</strong> From the composer’s
              plus menu, choose Developer mode and select facts. Try: “Use facts
              to summarize my grades and show what changed recently.”
            </li>
          </ol>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href="https://chatgpt.com/" target="_blank" rel="noreferrer">
                Open ChatGPT
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://developers.openai.com/api/docs/guides/developer-mode"
                target="_blank"
                rel="noreferrer"
              >
                Official setup guide
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Other MCP clients can use the same server URL with OAuth. No API key
            or Google password needs to be pasted into the client.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
              Your data, your permission
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          facts tools read grades, assignments, grade history, and sync status.
          They cannot change school records or expose your Gmail inbox.
          Approving a connection lets that app receive the data it requests
          within the granted permissions; only connect apps you trust.
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Authorized apps</h2>
          </CardTitle>
          <CardDescription>
            Review OAuth permissions and revoke apps you no longer use. App
            names are supplied by their developers; check the client ID.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div role="status" className="space-y-3">
                <span className="sr-only">Loading authorized apps…</span>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-20 w-full" />
              </div>
            }
          >
            <AuthorizedApps />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
