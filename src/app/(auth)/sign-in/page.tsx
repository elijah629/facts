import { KeyRound, LockKeyhole } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignInButton } from "./sign-in-button";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const connecting = Object.values(params).some((value) => value !== undefined);

  return (
    <div className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-md items-center py-8">
      <Card className="w-full gap-0 overflow-hidden py-0 shadow-xl shadow-black/10">
        <CardHeader className="items-center border-b bg-muted/30 px-6 py-8 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
            <KeyRound aria-hidden="true" className="size-6" />
          </div>
          <CardTitle className="text-2xl">
            {connecting ? "Connect facts to ChatGPT" : "Welcome to facts"}
          </CardTitle>
          <CardDescription className="max-w-sm text-balance">
            Use the Google account that receives your FACTS grade report links.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-6 py-6">
          {connecting ? (
            <div className="rounded-xl border bg-muted/25 p-4 text-sm">
              <p className="font-medium">
                You’ll return to ChatGPT after sign-in.
              </p>
              <p className="mt-1 text-muted-foreground">
                Next, choose which grade data ChatGPT may read.
              </p>
            </div>
          ) : null}
          <SignInButton />
        </CardContent>
        <CardFooter className="justify-center gap-2 border-t bg-muted/20 px-6 py-4 text-xs text-muted-foreground">
          <LockKeyhole aria-hidden="true" className="size-3.5" />
          Gmail content and sign-in tokens stay private.
        </CardFooter>
      </Card>
    </div>
  );
}
