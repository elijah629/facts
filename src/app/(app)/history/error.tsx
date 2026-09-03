"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HistoryError({ reset }: { reset: () => void }) {
  return (
    <Card className="m-6">
      <CardHeader>
        <CardTitle>
          <h1>Grade history could not be loaded</h1>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p role="alert" className="text-sm text-muted-foreground">
          Your saved revisions are unavailable right now. Try again; no history
          has been changed.
        </p>
        <Button onClick={reset}>Try again</Button>
      </CardContent>
    </Card>
  );
}
