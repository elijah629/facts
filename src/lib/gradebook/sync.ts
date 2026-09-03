import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  gradebookHeads,
  gradebookRevisions,
  gradebookStreams,
} from "@/lib/db/schema";
import { fetchFactsReport } from "@/lib/facts/fetch-report";
import {
  validateFactsHtml,
  validateParsedReport,
} from "@/lib/facts/validate-report";
import {
  type FactsSourceCandidate,
  findFactsReportCandidates,
} from "@/lib/gmail/find-report";
import { parseReportFromHtml } from "@/lib/report/parser";
import { decryptSource, encryptSource } from "@/lib/security/source-encryption";
import { canonicalizeReport } from "./canonicalize";
import { diffGradebooks } from "./diff";
import { hashGradebook } from "./hash";
import { type RevisionRow, reconstructRows } from "./reconstruct";

export interface SyncResult {
  streamId: string;
  revisionId: string | null;
  stateHash: string | null;
  changed: boolean;
  stale: boolean;
  lastSuccessfulFactsFetch: Date | null;
  errorCode?: string;
}

interface Source {
  url: string;
  messageId: string | null;
  receivedAt: Date | null;
  discovered: boolean;
}

function safeError(error: unknown): { code: string; message: string } {
  const raw = error instanceof Error ? error.message : "SYNC_FAILED";
  const code = /^[A-Z0-9_]+$/.test(raw) ? raw : "SYNC_FAILED";
  const messages: Record<string, string> = {
    GOOGLE_ACCOUNT_NOT_CONNECTED: "Google account is not connected.",
    GOOGLE_AUTHORIZATION_UNAVAILABLE: "Google authorization is unavailable.",
    FACTS_REPORT_EXPIRED_OR_INVALID: "FACTS report link expired or is invalid.",
    FACTS_REPORT_STRUCTURE_INVALID: "FACTS returned an invalid report.",
  };
  return {
    code,
    message: messages[code] ?? "Gradebook synchronization failed.",
  };
}

async function ensureStream(userId: string) {
  await db
    .insert(gradebookStreams)
    .values({ userId })
    .onConflictDoNothing({ target: gradebookStreams.userId });
  const [stream] = await db
    .select({ id: gradebookStreams.id })
    .from(gradebookStreams)
    .where(eq(gradebookStreams.userId, userId))
    .limit(1);
  if (!stream) throw new Error("STREAM_CREATE_FAILED");
  await db
    .insert(gradebookHeads)
    .values({ streamId: stream.id })
    .onConflictDoNothing({ target: gradebookHeads.streamId });
  return stream.id;
}

async function validCandidate(
  candidate: FactsSourceCandidate,
): Promise<{ source: Source; html: string } | null> {
  try {
    const html = await fetchFactsReport(candidate.url);
    validateFactsHtml(html);
    const parsed = parseReportFromHtml(html);
    validateParsedReport(parsed);
    return {
      source: {
        url: candidate.url,
        messageId: candidate.messageId,
        receivedAt: candidate.receivedAt,
        discovered: true,
      },
      html,
    };
  } catch {
    return null;
  }
}

async function resolveSource(
  userId: string,
  encryptedActiveUrl: string | null,
  discoverNewSource: boolean,
): Promise<{ source: Source; html: string; scannedGmail: boolean }> {
  let scannedGmail = false;
  if (discoverNewSource || !encryptedActiveUrl) {
    try {
      const candidates = await findFactsReportCandidates(userId);
      scannedGmail = true;
      for (const candidate of candidates) {
        const valid = await validCandidate(candidate);
        if (valid) return { ...valid, scannedGmail: true };
      }
    } catch (error) {
      if (!encryptedActiveUrl) throw error;
    }
    if (!encryptedActiveUrl) throw new Error("NO_USABLE_FACTS_REPORT_FOUND");
  }

  if (encryptedActiveUrl) {
    const url = decryptSource(encryptedActiveUrl);
    try {
      const html = await fetchFactsReport(url);
      validateFactsHtml(html);
      validateParsedReport(parseReportFromHtml(html));
      return {
        source: { url, messageId: null, receivedAt: null, discovered: false },
        html,
        scannedGmail,
      };
    } catch {
      const candidates = await findFactsReportCandidates(userId);
      for (const candidate of candidates) {
        const valid = await validCandidate(candidate);
        if (valid) return { ...valid, scannedGmail: true };
      }
    }
  }
  throw new Error("NO_USABLE_FACTS_REPORT_FOUND");
}

export async function syncGradebook(
  userId: string,
  options: { discoverNewSource?: boolean } = {},
): Promise<SyncResult> {
  const streamId = await ensureStream(userId);
  const attemptedAt = new Date();
  const [currentHead] = await db
    .select()
    .from(gradebookHeads)
    .where(eq(gradebookHeads.streamId, streamId))
    .limit(1);

  await db
    .update(gradebookHeads)
    .set({ lastAttemptAt: attemptedAt, updatedAt: attemptedAt })
    .where(eq(gradebookHeads.streamId, streamId));

  try {
    const resolved = await resolveSource(
      userId,
      currentHead?.encryptedActiveFactsUrl ?? null,
      options.discoverNewSource === true,
    );
    const report = parseReportFromHtml(resolved.html);
    validateParsedReport(report);
    const observedAt = new Date();

    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`select stream_id from gradebook_heads where stream_id = ${streamId} for update`,
      );
      const [lockedHead] = await tx
        .select()
        .from(gradebookHeads)
        .where(eq(gradebookHeads.streamId, streamId))
        .limit(1);
      const rows = (await tx
        .select({
          id: gradebookRevisions.id,
          sequence: gradebookRevisions.sequence,
          kind: gradebookRevisions.kind,
          data: gradebookRevisions.data,
          observedAt: gradebookRevisions.observedAt,
          stateHash: gradebookRevisions.stateHash,
          sourceEmailReceivedAt: gradebookRevisions.sourceEmailReceivedAt,
        })
        .from(gradebookRevisions)
        .where(eq(gradebookRevisions.streamId, streamId))
        .orderBy(asc(gradebookRevisions.sequence))) as RevisionRow[];
      const previous = rows.length ? reconstructRows(rows) : undefined;
      const next = canonicalizeReport(report, previous);
      const stateHash = hashGradebook(next);
      let revisionId = lockedHead.headRevisionId;
      let changed = false;

      if (stateHash !== lockedHead.headStateHash) {
        const [revision] = await tx
          .insert(gradebookRevisions)
          .values({
            streamId,
            sequence: rows.length,
            parentRevisionId: lockedHead.headRevisionId,
            kind: previous ? "delta" : "initial",
            data: previous ? diffGradebooks(previous, next) : next,
            stateHash,
            observedAt,
            sourceMessageId:
              resolved.source.messageId ?? lockedHead.activeSourceMessageId,
            sourceEmailReceivedAt:
              resolved.source.receivedAt ?? rows.at(-1)?.sourceEmailReceivedAt,
          })
          .returning({ id: gradebookRevisions.id });
        revisionId = revision.id;
        changed = true;
      }

      await tx
        .update(gradebookHeads)
        .set({
          headRevisionId: revisionId,
          headStateHash: stateHash,
          lastSuccessfulFetchAt: observedAt,
          lastErrorCode: null,
          lastErrorMessage: null,
          ...(resolved.scannedGmail ? { lastGmailScanAt: observedAt } : {}),
          ...(resolved.source.discovered
            ? {
                encryptedActiveFactsUrl: encryptSource(resolved.source.url),
                activeSourceMessageId: resolved.source.messageId,
                activeSourceDiscoveredAt: observedAt,
              }
            : {}),
          updatedAt: observedAt,
        })
        .where(eq(gradebookHeads.streamId, streamId));

      return {
        streamId,
        revisionId,
        stateHash,
        changed,
        stale: false,
        lastSuccessfulFactsFetch: observedAt,
      };
    });
  } catch (error) {
    const safe = safeError(error);
    await db
      .update(gradebookHeads)
      .set({
        lastErrorCode: safe.code,
        lastErrorMessage: safe.message,
        updatedAt: new Date(),
      })
      .where(eq(gradebookHeads.streamId, streamId));
    return {
      streamId,
      revisionId: currentHead?.headRevisionId ?? null,
      stateHash: currentHead?.headStateHash ?? null,
      changed: false,
      stale: true,
      lastSuccessfulFactsFetch: currentHead?.lastSuccessfulFetchAt ?? null,
      errorCode: safe.code,
    };
  }
}
