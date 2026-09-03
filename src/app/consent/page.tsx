import { redirect } from "next/navigation";
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

  return (
    <div className="mx-auto max-w-lg space-y-5 py-16 text-center">
      <h1 className="text-3xl font-semibold">Allow grade access?</h1>
      <p className="text-muted-foreground">
        ChatGPT may read normalized current grades and observed grade history.
        Gmail tokens, email contents, FACTS links, SessionIDs, and raw HTML stay
        private to facts.
      </p>
      <p className="break-all text-sm text-muted-foreground">
        Client: {clientId}
      </p>
      <p className="font-mono text-sm">{scopes.join(" · ")}</p>
      <ConsentForm oauthQuery={oauthQuery.toString()} />
    </div>
  );
}
