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
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <p className="text-muted-foreground">
        Sign in with the Google account that receives your FACTS report links.
      </p>
      <SignInButton oauthQuery={oauthQuery.toString() || undefined} />
    </div>
  );
}
