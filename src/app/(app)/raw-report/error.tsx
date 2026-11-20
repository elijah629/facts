"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RawReportError({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto max-w-lg space-y-3 rounded-lg border p-5">
      <h1 className="text-xl font-semibold">Raw FACTS report unavailable</h1>
      <p className="text-sm text-muted-foreground">
        Try loading the report again. If the FACTS link has expired, refresh
        your gradebook before returning.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Back to gradebook</Link>
        </Button>
      </div>
    </section>
  );
}
