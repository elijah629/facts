import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { cache } from "react";
import { databaseRead } from "@/lib/db/read";
import { webAuth } from "./web";

export const currentSession = cache(async () => {
  const requestHeaders = await headers();
  if (!getSessionCookie(requestHeaders)) return null;
  return databaseRead(() =>
    webAuth.api.getSession({ headers: requestHeaders }),
  );
});
