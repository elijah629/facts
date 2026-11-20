import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { databaseRead } from "@/lib/db/read";
import { gradebookHeads, gradebookStreams } from "@/lib/db/schema";
import { fetchFactsReport } from "@/lib/facts/fetch-report";
import { validateFactsHtml } from "@/lib/facts/validate-report";
import { decryptSource } from "@/lib/security/source-encryption";

export async function rawGradebookReport(userId: string): Promise<string> {
  const [source] = await databaseRead(() =>
    db
      .select({ encryptedUrl: gradebookHeads.encryptedActiveFactsUrl })
      .from(gradebookStreams)
      .innerJoin(
        gradebookHeads,
        eq(gradebookHeads.streamId, gradebookStreams.id),
      )
      .where(eq(gradebookStreams.userId, userId))
      .limit(1),
  );
  if (!source?.encryptedUrl) throw new Error("FACTS_SOURCE_NOT_FOUND");
  const html = await fetchFactsReport(decryptSource(source.encryptedUrl));
  validateFactsHtml(html);
  return html;
}
