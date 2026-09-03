import { History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { currentSession } from "@/lib/auth/session";
import { revisionHistoryPage } from "@/lib/gradebook/history-view";

export const metadata: Metadata = { title: "Grade history · facts" };

function observed(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function percentage(value: number | null | undefined) {
  return value == null ? "—" : `${value.toFixed(2)}%`;
}

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
            <h1>Grade history</h1>
          </CardTitle>
          <CardDescription>
            Sign in to view your saved grade changes. History is private to your
            account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/sign-in">Sign in to facts</Link>
          </Button>
        </CardContent>
      </Card>
    );
  const params = await searchParams;
  const query = z
    .object({
      before: z
        .string()
        .regex(/^\d+$/)
        .transform(Number)
        .pipe(z.number().int().nonnegative().max(2147483647))
        .optional(),
      revision: z.uuid().optional(),
    })
    .safeParse({ before: params.before, revision: params.revision });
  if (!query.success)
    return (
      <Card className="m-6">
        <CardHeader>
          <CardTitle>
            <h1>Invalid history link</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/history">View latest history</Link>
          </Button>
        </CardContent>
      </Card>
    );
  const { revisions, hasOlder, selected } = await revisionHistoryPage(
    session.user.id,
    query.data,
  );
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <History aria-hidden="true" className="size-7" />
          Grade history
        </h1>
        <p className="text-muted-foreground">
          Explore the changes facts observed in your gradebook, reconstructed
          from saved revisions.
        </p>
        <p className="text-sm text-muted-foreground">
          Times are UTC observations, not the time a teacher edited a grade.
          Unchanged checks do not create revisions.
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Saved revisions</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {revisions.length ? (
              <nav aria-label="Gradebook revisions">
                <ol className="space-y-2">
                  {revisions.map((revision) => (
                    <li key={revision.id}>
                      <Link
                        prefetch={false}
                        href={{
                          pathname: "/history",
                          query: {
                            revision: revision.id,
                            ...(query.data.before === undefined
                              ? {}
                              : { before: query.data.before }),
                          },
                        }}
                        aria-current={
                          revision.id === selected?.id ? "page" : undefined
                        }
                        className="block rounded-md border p-3 text-sm hover:bg-accent aria-[current=page]:border-primary aria-[current=page]:bg-accent"
                      >
                        <span className="font-medium">
                          Revision {revision.sequence + 1}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          <time dateTime={revision.observedAt.toISOString()}>
                            {observed(revision.observedAt)}
                          </time>
                        </span>
                        <span className="mt-1 block text-xs">
                          {revision.kind === "initial"
                            ? "Initial snapshot"
                            : "Changes"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : (
              <p className="text-sm text-muted-foreground">
                No revisions on this page.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {query.data.before !== undefined ? (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/history">Latest</Link>
                </Button>
              ) : null}
              {hasOlder ? (
                <Button size="sm" variant="outline" asChild>
                  <Link
                    prefetch={false}
                    href={{
                      pathname: "/history",
                      query: { before: revisions.at(-1)?.sequence },
                    }}
                  >
                    Older revisions
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <div className="min-w-0 space-y-6">
          {!selected ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>
                    {query.data.revision
                      ? "Revision unavailable"
                      : "No saved history yet"}
                  </h2>
                </CardTitle>
                <CardDescription>
                  {query.data.revision
                    ? "This revision does not exist or does not belong to your account."
                    : "Open your gradebook to sync your first report. Future changes will appear here."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href={query.data.revision ? "/history" : "/"}>
                    {query.data.revision
                      ? "View latest history"
                      : "Open gradebook"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>
                    <h2>Revision {selected.sequence + 1}</h2>
                  </CardTitle>
                  <CardDescription>
                    <time dateTime={selected.observedAt.toISOString()}>
                      {observed(selected.observedAt)} UTC
                    </time>{" "}
                    · {selected.calculated.term}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">
                    Weighted GPA:{" "}
                    <span className="font-mono">
                      {selected.previousCalculated
                        ? `${selected.previousCalculated.gpa?.toFixed(3) ?? "—"} → `
                        : ""}
                      {selected.calculated.gpa?.toFixed(3) ?? "—"}
                    </span>
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead>Before</TableHead>
                        <TableHead>At this revision</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selected.calculated.classes.map((cls) => (
                        <TableRow key={cls.id}>
                          <TableCell className="whitespace-normal break-words">
                            {cls.name}
                          </TableCell>
                          <TableCell className="font-mono">
                            {percentage(
                              selected.previousCalculated?.classes.find(
                                (item) => item.id === cls.id,
                              )?.percentage,
                            )}
                          </TableCell>
                          <TableCell className="font-mono">
                            {percentage(cls.percentage)} {cls.letter}
                          </TableCell>
                        </TableRow>
                      ))}
                      {selected.previousCalculated?.classes
                        .filter(
                          (cls) =>
                            !selected.calculated.classes.some(
                              (item) => item.id === cls.id,
                            ),
                        )
                        .map((cls) => (
                          <TableRow key={cls.id}>
                            <TableCell className="whitespace-normal">
                              {cls.name}
                            </TableCell>
                            <TableCell className="font-mono">
                              {percentage(cls.percentage)}
                            </TableCell>
                            <TableCell>Removed</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  <p className="text-xs text-muted-foreground">
                    Historical percentages use the current facts grading
                    calculator.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>
                    <h2>
                      {selected.kind === "initial"
                        ? "Starting point"
                        : "What changed"}
                    </h2>
                  </CardTitle>
                  <CardDescription>
                    {selected.kind === "initial"
                      ? "This first snapshot is the baseline. Select a later revision to see before-and-after changes."
                      : `${selected.changes.length} field and record changes since the preceding revision.`}
                  </CardDescription>
                </CardHeader>
                {selected.changes.length ? (
                  <CardContent>
                    <ul className="divide-y">
                      {selected.changes.map((change) => (
                        <li
                          key={change.id}
                          className="space-y-2 py-4 first:pt-0 last:pb-0"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{change.kind}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {change.className}
                            </span>
                          </div>
                          <h3 className="break-words text-sm font-medium">
                            {change.item} · {change.field}
                          </h3>
                          <dl className="grid gap-2 text-sm sm:grid-cols-2">
                            <div className="min-w-0">
                              <dt className="text-xs text-muted-foreground">
                                Before
                              </dt>
                              <dd className="whitespace-pre-wrap break-words">
                                {change.before}
                              </dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="text-xs text-muted-foreground">
                                After
                              </dt>
                              <dd className="whitespace-pre-wrap break-words">
                                {change.after}
                              </dd>
                            </div>
                          </dl>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                ) : null}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
