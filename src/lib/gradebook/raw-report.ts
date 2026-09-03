import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gradebookHeads, gradebookStreams } from "@/lib/db/schema";
import { fetchFactsReport } from "@/lib/facts/fetch-report";
import { decryptSource } from "@/lib/security/source-encryption";

export async function rawGradebookReport(userId: string): Promise<string> {
  const [source] = await db
    .select({ encryptedUrl: gradebookHeads.encryptedActiveFactsUrl })
    .from(gradebookStreams)
    .innerJoin(gradebookHeads, eq(gradebookHeads.streamId, gradebookStreams.id))
    .where(eq(gradebookStreams.userId, userId))
    .limit(1);
  if (!source?.encryptedUrl) throw new Error("FACTS_SOURCE_NOT_FOUND");
  return fetchFactsReport(decryptSource(source.encryptedUrl));
}
