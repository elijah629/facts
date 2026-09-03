import { SignInButton } from "./sign-in-button";

export default async function SignInPage({
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

  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-3xl font-semibold">Sign in to facts</h1>
      <p className="text-muted-foreground">
        Use your verified @mygarces.org Google account. facts reads only FACTS
        progress-report email needed to discover your live report link.
      </p>
      <SignInButton oauthQuery={oauthQuery.toString() || undefined} />
    </div>
  );
}
