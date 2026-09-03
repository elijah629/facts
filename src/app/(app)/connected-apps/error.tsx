"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConnectedAppsError({ reset }: { reset: () => void }) {
  return (
    <Card className="m-6">
      <CardHeader>
        <CardTitle>
          <h1>Connected apps could not be loaded</h1>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p role="alert" className="text-sm text-muted-foreground">
          Your account or app permissions are unavailable right now. Try again
          to reload them.
        </p>
        <Button onClick={reset}>Try again</Button>
      </CardContent>
    </Card>
  );
}
