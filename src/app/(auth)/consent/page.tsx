import { BookOpenCheck, History, LockKeyhole, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { currentSession } from "@/lib/auth/session";
import { ConsentForm } from "./consent-form";

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const oauthQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) oauthQuery.append(key, item);
    } else if (value !== undefined) oauthQuery.set(key, value);
  }
  if (!(await currentSession())) redirect(`/sign-in?${oauthQuery.toString()}`);
  const scopes = oauthQuery.get("scope")?.split(" ") ?? [];
  const clientId = oauthQuery.get("client_id") ?? "Unknown client";
  const gradeScopes = scopes.filter((scope) => scope.startsWith("grades:"));

  return (
    <div className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-xl items-center py-8">
      <Card className="w-full gap-0 overflow-hidden py-0 shadow-xl shadow-black/10">
        <CardHeader className="items-center border-b bg-muted/30 px-6 py-8 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </div>
          <CardTitle className="text-2xl">Allow grade access?</CardTitle>
          <CardDescription className="max-w-md text-balance">
            ChatGPT is asking facts for permission to read your grade data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-6 py-6">
          <div className="space-y-3">
            {scopes.includes("grades:read") ? (
              <Permission
                icon={<BookOpenCheck />}
                title="Current grades"
                description="Classes, assignments, scores, and calculated grades."
              />
            ) : null}
            {scopes.includes("grades:history") ? (
              <Permission
                icon={<History />}
                title="Grade history"
                description="Previously observed grade changes and trends."
              />
            ) : null}
          </div>

          <div className="flex gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
            <LockKeyhole
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-emerald-400"
            />
            <div className="text-sm">
              <p className="font-medium text-emerald-300">
                Private data stays private
              </p>
              <p className="mt-1 text-muted-foreground">
                Gmail tokens, email contents, FACTS links, SessionIDs, and raw
                HTML are never shared with ChatGPT.
              </p>
            </div>
          </div>

          <details className="group rounded-lg border px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium marker:text-muted-foreground">
              Connection details
            </summary>
            <div className="mt-3 space-y-3 text-muted-foreground">
              <p className="break-all font-mono text-xs">Client: {clientId}</p>
              <div className="flex flex-wrap gap-2">
                {gradeScopes.map((scope) => (
                  <Badge className="font-mono" key={scope} variant="secondary">
                    {scope}
                  </Badge>
                ))}
              </div>
            </div>
          </details>
        </CardContent>
        <CardFooter className="border-t bg-muted/20 px-6 py-5">
          <ConsentForm />
        </CardFooter>
      </Card>
    </div>
  );
}

function Permission({
  description,
  icon,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border bg-card p-4">
      <div
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground [&_svg]:size-4"
      >
        {icon}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
