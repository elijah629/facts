import type { Metadata } from "next";
import Link from "next/link";
import { HistoryTimeline } from "@/components/history-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { currentSession } from "@/lib/auth/session";
import { revisionHistoryPage } from "@/lib/gradebook/history-view";
import { timelineQuery } from "@/lib/gradebook/timeline-query";
export const metadata: Metadata = { title: "Grade history · facts" };
export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await currentSession();
  if (!session)
    return (
      <Card className="m-6">
        <CardHeader>
          <CardTitle>
            <h1>Sign in to see your grade history</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/sign-in">Sign in to facts</Link>
          </Button>
        </CardContent>
      </Card>
    );
  const params = await searchParams;
  const query = timelineQuery.safeParse({
    before: params.before,
    revision: params.revision,
  });
  if (!query.success)
    return (
      <Card className="m-6">
        <CardHeader>
          <CardTitle>
            <h1>This history link isn’t valid</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/history">View latest history</Link>
          </Button>
        </CardContent>
      </Card>
    );
  const initial = await revisionHistoryPage(session.user.id, query.data);
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Grade history</h1>
        <p className="text-muted-foreground">
          Your grades over time, and what changed along the way.
        </p>
      </header>
      <HistoryTimeline initial={initial} />
    </div>
  );
}
