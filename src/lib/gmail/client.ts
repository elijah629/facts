import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { account } from "@/lib/db/schema";
import { gmailErrorCode } from "./errors";

export interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

const GMAIL_API = new URL("https://gmail.googleapis.com/gmail/v1/");

export async function googleAccessToken(userId: string): Promise<string> {
  const [google] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
    .limit(1);
  if (!google) throw new Error("GOOGLE_ACCOUNT_NOT_CONNECTED");
  const token = await auth.api.getAccessToken({
    body: { accountId: google.id, userId },
  });
  if (!token.accessToken) throw new Error("GOOGLE_AUTHORIZATION_UNAVAILABLE");
  return token.accessToken;
}

export async function gmailFetch<T>(
  userId: string,
  path: string,
  searchParams: Record<string, string> = {},
): Promise<T> {
  const token = await googleAccessToken(userId);
  const url = new URL(path, GMAIL_API);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(await gmailErrorCode(response));
  return (await response.json()) as T;
}

export function decodeGmailBody(value: string | undefined): string {
  if (!value) return "";
  return Buffer.from(value, "base64url").toString("utf8");
}

export function flattenGmailBody(part: GmailPart): string {
  return [
    part.mimeType === "text/html" || part.mimeType === "text/plain"
      ? decodeGmailBody(part.body?.data)
      : "",
    ...(part.parts ?? []).map(flattenGmailBody),
  ].join("\n");
}
